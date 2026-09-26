"""The executor end to end, with a fake rotator on a mock transport: what happens around a
rotation (due dates, daily limit, leaks, claims, crashes), not inside the browser."""

import json
from dataclasses import dataclass, field
from datetime import datetime, timedelta
from pathlib import Path
from typing import Any

import httpx
import pytest
from pydantic import SecretStr
from sqlalchemy import Engine
from sqlmodel import Session, select

from serenity.agent import executor, rotations
from serenity.agent.executor import (
    DAILY_LIMIT,
    INTERRUPTED,
    ROTATION_MANUAL,
    _claim,
    recover_interrupted,
    run_rotations,
)
from serenity.config import Settings
from serenity.models import (
    AuditLog,
    Breach,
    BreachKind,
    BreachStatus,
    Item,
    Notification,
    PolicyMode,
    Rotation,
    RotationPolicy,
    RotationStatus,
    utcnow,
)
from tests.conftest import Account

# Throwaway value for the fake entries below.
START = "mot-de-passe-de-depart"


@dataclass
class FakeExecutor:
    """The rotator container, reduced to a site that knows one password.

    `change`: "ok" answers the change; "lost" applies it then answers 504, as a timeout
    behind a proxy would; "down" applies it, then the site stops answering altogether."""

    password: str = START
    change: str = "ok"
    down: bool = False
    calls: list[str] = field(default_factory=list)

    def __call__(self, request: httpx.Request) -> httpx.Response:
        path = request.url.path
        self.calls.append(path)
        if path == "/recettes":
            return httpx.Response(
                200, json={"recipes": [{"name": "demo", "domains": ["demo.serenity.test"]}]}
            )
        if self.down:
            return httpx.Response(502, text="<html>Bad Gateway</html>")
        body = json.loads(request.content)
        if path == "/verify":
            return httpx.Response(200, json={"ok": body["password"] == self.password})
        if path == "/change":
            if body["password"] != self.password:
                return httpx.Response(200, json={"ok": False, "error": "connexion refusée"})
            self.password = body["new_password"]
            if self.change == "lost":
                return httpx.Response(504, text="Gateway Timeout")
            if self.change == "down":
                self.down = True
                return httpx.Response(504, text="Gateway Timeout")
            return httpx.Response(200, json={"ok": True})
        return httpx.Response(404)


def executor_settings(settings: Settings, tmp_path: Path, **update: Any) -> Settings:
    allowlist = tmp_path / "allowlist.yaml"
    allowlist.write_text("domains:\n  - demo.serenity.test\n", encoding="utf-8")
    return settings.model_copy(
        update={
            "rotator_url": "http://rotator:8000",
            "rotator_token": SecretStr("jeton"),
            "allowlist_file": allowlist,
            **update,
        }
    )


def http(site: FakeExecutor) -> httpx.Client:
    return httpx.Client(transport=httpx.MockTransport(site))


def due_entry(account: Account, name: str = "Démo") -> dict[str, Any]:
    """An agent-zone entry on an autonomous 30-day policy, overdue by 70 days."""
    keys = account.keys()
    entry = {
        "v": 1,
        "type": "login",
        "name": name,
        "username": "tristan",
        "password": START,
        "urls": ["https://demo.serenity.test/connexion"],
    }
    item = account.api.move(keys, account.api.add(keys, entry), "agent")
    account.api.call(
        "PUT",
        f"/api/vault/items/{item['id']}/policy",
        {
            "frequency_days": 30,
            "mode": "autonomous",
            "changed_at": (utcnow() - timedelta(days=100)).isoformat(),
        },
    )
    return item


def rotations_of(engine: Engine) -> list[Rotation]:
    with Session(engine) as session:
        return list(session.exec(select(Rotation).order_by(Rotation.id)))  # type: ignore[arg-type]


def close_to(a: datetime | None, b: datetime) -> bool:
    return a is not None and abs(a - b) < timedelta(seconds=1)


def test_a_done_rotation_moves_the_due_date_and_closes_the_leak(
    account: Account, engine: Engine, settings: Settings, agent_ready: bytes, tmp_path: Path
) -> None:
    """Without this, an autonomous rotation was due again at the next hourly pass, for ever."""
    item = due_entry(account)
    with Session(engine) as session:
        session.add(
            Breach(
                user_id=account.user_id,
                kind=BreachKind.PWNED_PASSWORD,
                subject=item["id"],
                item_id=item["id"],
                source="agent",
            )
        )
        session.commit()
        assert rotations.run_schedule(session, utcnow()).scheduled == 1
    site = FakeExecutor()
    now = utcnow()
    report = run_rotations(
        engine, agent_ready, executor_settings(settings, tmp_path), now, http(site)
    )
    assert (report.run, report.succeeded) == (1, 1)
    with Session(engine) as session:
        policy = session.get(RotationPolicy, item["id"])
        assert policy is not None
        assert close_to(policy.changed_at, now)
        assert close_to(policy.next_due_at, now + timedelta(days=30))
        breach = session.exec(select(Breach)).one()
        assert breach.status == BreachStatus.RESOLVED
        # The next hourly pass has nothing to do.
        assert rotations.run_schedule(session, utcnow() + timedelta(hours=1)).scheduled == 0


def test_the_daily_limit_holds_for_autonomous_rotations(
    account: Account, engine: Engine, settings: Settings, agent_ready: bytes, tmp_path: Path
) -> None:
    due_entry(account, "Un")
    due_entry(account, "Deux")
    with Session(engine) as session:
        assert rotations.run_schedule(session, utcnow()).scheduled == 2
    limited = executor_settings(settings, tmp_path, max_rotations_per_day=1)
    report = run_rotations(engine, agent_ready, limited, utcnow(), http(FakeExecutor()))
    assert (report.run, report.succeeded) == (1, 1)
    first, second = rotations_of(engine)
    assert first.status == RotationStatus.SUCCEEDED
    assert (second.status, second.error) == (RotationStatus.SCHEDULED, DAILY_LIMIT)
    # Still capped on the next pass, and the journal does not repeat itself.
    again = run_rotations(engine, agent_ready, limited, utcnow(), http(FakeExecutor()))
    assert again.run == 0
    with Session(engine) as session:
        skipped = [
            a
            for a in session.exec(select(AuditLog))
            if a.outcome == "skipped" and a.details.get("reason") == "daily_limit"
        ]
    assert len(skipped) == 1


def test_an_unreadable_entry_does_not_stop_the_batch(
    account: Account, engine: Engine, settings: Settings, agent_ready: bytes, tmp_path: Path
) -> None:
    broken = due_entry(account, "Abîmée")
    due_entry(account, "Saine")
    with Session(engine) as session:
        rotations.run_schedule(session, utcnow())
        row = session.get(Item, broken["id"])
        assert row is not None
        row.block = bytes(80)  # no key opens this
        session.add(row)
        session.commit()
    report = run_rotations(
        engine, agent_ready, executor_settings(settings, tmp_path), utcnow(), http(FakeExecutor())
    )
    assert (report.run, report.succeeded, report.failed) == (2, 1, 1)
    statuses = {r.item_id: r.status for r in rotations_of(engine)}
    assert statuses[broken["id"]] == RotationStatus.FAILED
    with Session(engine) as session:
        failures = [
            a
            for a in session.exec(select(AuditLog))
            if a.action == "agent.rotation.execute" and a.outcome == "failure"
        ]
    assert [a.target_id for a in failures] == [broken["id"]]


def test_an_unexpected_error_never_leaves_a_rotation_in_progress(
    account: Account,
    engine: Engine,
    settings: Settings,
    agent_ready: bytes,
    tmp_path: Path,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    due_entry(account)
    with Session(engine) as session:
        rotations.run_schedule(session, utcnow())

    def boom() -> str:
        raise RuntimeError("panne")

    monkeypatch.setattr(executor, "new_password", boom)
    report = run_rotations(
        engine, agent_ready, executor_settings(settings, tmp_path), utcnow(), http(FakeExecutor())
    )
    assert report.failed == 1
    (rotation,) = rotations_of(engine)
    assert rotation.status == RotationStatus.FAILED
    assert rotation.error and "RuntimeError" in rotation.error


def test_a_change_whose_answer_was_lost_is_checked_on_the_site(
    account: Account, engine: Engine, settings: Settings, agent_ready: bytes, tmp_path: Path
) -> None:
    """A 504 on the change does not mean the site kept the old password: here it took the new
    one, and throwing the pending block away would have lost the account."""
    item = due_entry(account)
    with Session(engine) as session:
        rotations.run_schedule(session, utcnow())
    site = FakeExecutor(change="lost")
    report = run_rotations(
        engine, agent_ready, executor_settings(settings, tmp_path), utcnow(), http(site)
    )
    assert report.succeeded == 1
    keys = account.keys()
    fresh = next(i for i in account.api.sync()["items"] if i["id"] == item["id"])
    assert account.api.decrypt(keys, fresh)["password"] == site.password != START


def test_a_lost_change_on_a_site_gone_silent_keeps_both_passwords(
    account: Account, engine: Engine, settings: Settings, agent_ready: bytes, tmp_path: Path
) -> None:
    item = due_entry(account)
    with Session(engine) as session:
        rotations.run_schedule(session, utcnow())
    site = FakeExecutor(change="down")
    report = run_rotations(
        engine, agent_ready, executor_settings(settings, tmp_path), utcnow(), http(site)
    )
    assert report.failed == 1
    (rotation,) = rotations_of(engine)
    assert rotation.status == RotationStatus.FAILED
    keys = account.keys()
    fresh = next(i for i in account.api.sync()["items"] if i["id"] == item["id"])
    assert fresh["pending_block"] is not None  # the only copy of what the site now holds
    pending = {**fresh, "block": fresh["pending_block"], "revision": fresh["pending_revision"]}
    assert account.api.decrypt(keys, pending)["password"] == site.password


def test_a_rotation_is_claimed_once(
    account: Account, engine: Engine, settings: Settings, agent_ready: bytes
) -> None:
    due_entry(account)
    with Session(engine) as session:
        rotations.run_schedule(session, utcnow())
    with Session(engine) as first, Session(engine) as second:
        a = first.exec(select(Rotation)).one()
        b = second.exec(select(Rotation)).one()
        assert _claim(first, a, utcnow()) is True
        assert _claim(second, b, utcnow()) is False
        assert b.status == RotationStatus.IN_PROGRESS  # refreshed: the other pass has it


def test_a_rotation_cut_off_by_a_restart_is_marked_failed(
    account: Account, engine: Engine, agent_ready: bytes
) -> None:
    item = due_entry(account)
    with Session(engine) as session:
        session.add(
            Rotation(
                user_id=account.user_id,
                item_id=item["id"],
                status=RotationStatus.IN_PROGRESS,
                trigger="schedule",
                mode=PolicyMode.AUTONOMOUS,
                started_at=utcnow(),
            )
        )
        session.commit()
        assert recover_interrupted(session, utcnow()) == 1
        rotation = session.exec(select(Rotation)).one()
        assert (rotation.status, rotation.error) == (RotationStatus.FAILED, INTERRUPTED)
        kinds = [n.kind for n in session.exec(select(Notification))]
    assert ROTATION_MANUAL in kinds
