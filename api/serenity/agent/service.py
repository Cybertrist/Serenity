"""Agent process: holds the server key, publishes its public half, and (later) runs the jobs.

Phase 2 only starts the process, checks the key and keeps a heartbeat. Rotations,
watcher and kill switch arrive in phases 5 and 6.
"""

import logging
import signal
import threading
from datetime import datetime, timedelta
from pathlib import Path
from typing import Any

import httpx
from apscheduler.schedulers.background import BackgroundScheduler
from sqlalchemy import Engine
from sqlmodel import Session

from serenity import audit
from serenity.agent.executor import run_rotations
from serenity.agent.rotations import run_schedule
from serenity.agent.watch import run_watch
from serenity.config import Settings
from serenity.crypto.encoding import b64url_encode
from serenity.crypto.server_key import server_public_key
from serenity.db import check_schema, create_db_engine
from serenity.models import Actor, Setting, utcnow
from serenity.watcher.hibp import Hibp
from serenity.watcher.pwned import PwnedPasswords

logger = logging.getLogger(__name__)

SERVER_KEY_SETTING = "server_key"


class ServerKeyMismatchError(RuntimeError):
    """The mounted server key is not the one the database was sealed for."""


def publish_server_key(session: Session, seed: bytes, now: datetime) -> dict[str, Any]:
    """Store the public key and key id for clients. Refuse a different key than the recorded one."""
    public_key, key_id = server_public_key(seed)
    info = {"public_key": b64url_encode(public_key), "key_id": b64url_encode(key_id)}
    row = session.get(Setting, SERVER_KEY_SETTING)
    if row is not None:
        if row.value.get("key_id") != info["key_id"]:
            raise ServerKeyMismatchError(
                f"server key id {info['key_id']} does not match the recorded "
                f"{row.value.get('key_id')}: restore data/keys/server.key from its backup"
            )
        return info
    session.add(Setting(key=SERVER_KEY_SETTING, value=info, updated_at=now))
    session.commit()
    audit.record(session, Actor.SYSTEM, "agent.server_key.published", details=info)
    return info


def touch(path: Path) -> None:
    path.touch()


class Agent:
    def __init__(self, settings: Settings, engine: Engine, server_key: bytes) -> None:
        self._settings = settings
        self._engine = engine
        # Kept in memory only: opens sealed agent keys.
        self._server_key = server_key
        self.stop_event = threading.Event()

    def start(self) -> dict[str, Any]:
        check_schema(self._engine)
        with Session(self._engine) as session:
            info = publish_server_key(session, self._server_key, utcnow())
            audit.record(session, Actor.AGENT, "agent.start", details={"key_id": info["key_id"]})
        logger.info("agent started, server key id %s", info["key_id"])
        return info

    def schedule_once(self) -> None:
        """Due dates: rotations for the agent zone, reminders for the personal zone."""
        with Session(self._engine) as session:
            report = run_schedule(session, utcnow())
        logger.info(
            "schedule: %d rotation(s), %d reminder(s)%s",
            report.scheduled,
            report.reminders,
            " (kill switch)" if report.skipped else "",
        )

    def rotate_once(self) -> None:
        """Run what the schedule (or the user) left waiting. Nothing here raises upwards:
        a site that misbehaves must not take the agent down."""
        try:
            report = run_rotations(self._engine, self._server_key, self._settings, utcnow())
        except Exception:  # last line of defence around a browser and a site
            logger.exception("rotation run failed")
            return
        if report.run or report.skipped:
            logger.info(
                "rotations: %d run, %d ok, %d rolled back, %d failed%s",
                report.run,
                report.succeeded,
                report.rolled_back,
                report.failed,
                " (kill switch)" if report.skipped else "",
            )

    def watch_once(self) -> None:
        """One server-side watch run (agent zone, watched e-mails). Errors never stop the agent."""
        key = self._settings.hibp_api_key
        with httpx.Client(timeout=20) as http:
            hibp = Hibp(http, key.get_secret_value()) if key and key.get_secret_value() else None
            report = run_watch(self._engine, self._server_key, PwnedPasswords(http), hibp, utcnow())
        logger.info(
            "watch: %d user(s), %d new alert(s)%s",
            report.users,
            report.new_alerts,
            " (kill switch)" if report.skipped else "",
        )

    def run_forever(self) -> None:
        scheduler = BackgroundScheduler(timezone="UTC")
        scheduler.add_job(
            self.schedule_once,
            "interval",
            minutes=self._settings.schedule_interval_minutes,
            next_run_time=utcnow() + timedelta(seconds=self._settings.watch_first_delay_seconds),
            max_instances=1,
            coalesce=True,
            id="schedule",
        )
        scheduler.add_job(
            self.rotate_once,
            "interval",
            minutes=self._settings.schedule_interval_minutes,
            next_run_time=utcnow()
            + timedelta(seconds=self._settings.watch_first_delay_seconds + 30),
            max_instances=1,
            coalesce=True,
            id="rotate",
        )
        scheduler.add_job(
            self.watch_once,
            "interval",
            hours=self._settings.watch_interval_hours,
            next_run_time=utcnow() + timedelta(seconds=self._settings.watch_first_delay_seconds),
            max_instances=1,
            coalesce=True,
            id="watch",
        )
        touch(self._settings.agent_heartbeat_file)
        scheduler.start()
        try:
            while not self.stop_event.wait(self._settings.agent_heartbeat_seconds):
                touch(self._settings.agent_heartbeat_file)
        finally:
            scheduler.shutdown(wait=False)
        with Session(self._engine) as session:
            audit.record(session, Actor.AGENT, "agent.stop")
        logger.info("agent stopped")


def run_agent(settings: Settings, server_key: bytes) -> None:
    audit.configure_logging(settings.log_level)
    engine = create_db_engine(settings.db_path)
    agent = Agent(settings, engine, server_key)
    for signum in (signal.SIGTERM, signal.SIGINT):
        signal.signal(signum, lambda *_: agent.stop_event.set())
    try:
        agent.start()
        agent.run_forever()
    finally:
        engine.dispose()
