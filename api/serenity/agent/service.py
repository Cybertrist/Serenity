"""Agent process: holds the server key, publishes its public half, and (later) runs the jobs.

Phase 2 only starts the process, checks the key and keeps a heartbeat. Rotations,
watcher and kill switch arrive in phases 5 and 6.
"""

import logging
import signal
import threading
from datetime import datetime
from pathlib import Path
from typing import Any

from sqlalchemy import Engine
from sqlmodel import Session

from serenity import audit
from serenity.config import Settings
from serenity.crypto.encoding import b64url_encode
from serenity.crypto.server_key import server_public_key
from serenity.db import check_schema, create_db_engine
from serenity.models import Actor, Setting, utcnow

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
        # Kept in memory only: opens sealed agent keys (phase 4).
        self._server_key = server_key
        self.stop_event = threading.Event()

    def start(self) -> dict[str, Any]:
        check_schema(self._engine)
        with Session(self._engine) as session:
            info = publish_server_key(session, self._server_key, utcnow())
            audit.record(session, Actor.AGENT, "agent.start", details={"key_id": info["key_id"]})
        logger.info("agent started, server key id %s", info["key_id"])
        return info

    def run_forever(self) -> None:
        while not self.stop_event.is_set():
            touch(self._settings.agent_heartbeat_file)
            self.stop_event.wait(self._settings.agent_heartbeat_seconds)
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
