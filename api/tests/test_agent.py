"""Agent: allowlist, transactional rotation, policies, schedule, kill switch, decisions.

The key property: the agent can never touch a personal entry.
"""

from dataclasses import dataclass, field
from datetime import UTC, datetime, timedelta
from typing import Any

import pytest
from fastapi.testclient import TestClient
from sqlmodel import Session, select

from serenity.agent import killswitch, rotations
from serenity.agent.allowlist import AllowlistError, is_allowed, parse_allowlist
from serenity.devclient import ApiError, Keyring
from serenity.models import (
    AuditLog,
    Breach,
    BreachKind,
    Item,
    Notification,
    PolicyMode,
    Rotation,
    RotationPolicy,
    RotationStatus,
)
from serenity.rotator.base import Credentials, RotationError, RotationRun, Step
from tests.conftest import Account

NOW = datetime(2026, 9, 18, 12, 0, tzinfo=UTC)


# --- allowlist ---------------------------------------------------------------------------


def test_allowlist_parsing() -> None:
    text = "# comment\ndomains:\n  - Netflix.com   # the video one\n  - spotify.com\n"
    assert parse_allowlist(text) == {"netflix.com", "spotify.com"}
    assert parse_allowlist("domains: []\n") == frozenset()
    for bad in (
        "",
        "domain:\n  - a.com",
        "domains:\n  - not a domain",
        "domains:\nother: 1",
        "domains: [a.com]",
    ):
        with pytest.raises(AllowlistError):
            parse_allowlist(bad)


@pytest.mark.parametrize(
    ("urls", "allowed"),
    [
        (["https://www.netflix.com/login"], True),
        (["netflix.com"], True),
        (["https://netflix.com.evil.example"], False),
        (["https://evilnetflix.com"], False),
        (["https://www.netflix.com", "https://phishing.example"], False),
        ([], False),
        ([""], False),
    ],
)
def test_allowlist_matching(urls: list[str], allowed: bool) -> None:
    assert is_allowed(urls, frozenset({"netflix.com"})) is allowed


# --- transactional rotation (rule 6) --------------------------------------------------------


@dataclass
class FakeSite:
    """Site double: keeps the real password, can be told to fail at each step."""

    password: str
    domains: frozenset[str] = frozenset({"netflix.com"})
    fail_change: bool = False
    fail_verify_new: bool = False
    fail_restore: bool = False
    calls: list[str] = field(default_factory=list)

    def login(self, credentials: Credentials) -> None:
        self.calls.append("login")
        if credentials.password != self.password:
            raise RotationError("connexion refusée")

    def change_password(self, current: Credentials, new_password: str) -> None:
        self.calls.append("change")
        restoring = new_password == "old-password"
        if (self.fail_change and not restoring) or (self.fail_restore and restoring):
            raise RotationError("changement refusé par le site")
        self.password = new_password

    def verify(self, credentials: Credentials) -> bool:
        self.calls.append("verify")
        if self.fail_verify_new and credentials.password != "old-password":
            return False
        return credentials.password == self.password


@dataclass
class FakeVault:
    current: str = "old-password"
    pending: str | None = None
    fail_save: bool = False

    def save_pending(self, new_password: str) -> None:
        if self.fail_save:
            raise OSError("disk full")
        self.pending = new_password

    def commit_pending(self) -> None:
        assert self.pending is not None
        self.current, self.pending = self.pending, None

    def discard_pending(self) -> None:
        self.pending = None


OLD = Credentials("tristan", "old-password")


def _run(site: FakeSite, vault: FakeVault, urls: list[str] | None = None) -> RotationRun:
    run = RotationRun(
        urls=urls or ["https://www.netflix.com"], allowlist=frozenset({"netflix.com"})
    )
    run.execute(site, vault, OLD, "new-password")
    return run


def test_rotation_success_saves_pending_first() -> None:
    site, vault = FakeSite("old-password"), FakeVault()
    run = _run(site, vault)
    assert run.history == [
        Step.READY,
        Step.PENDING_SAVED,
        Step.SITE_CHANGED,
        Step.VERIFIED,
        Step.COMMITTED,
    ]
    assert (site.password, vault.current, vault.pending) == ("new-password", "new-password", None)


def test_rotation_refuses_a_site_outside_the_allowlist() -> None:
    site, vault = FakeSite("old-password"), FakeVault()
    run = _run(site, vault, ["https://phishing.example"])
    assert run.step == Step.FAILED
    assert site.calls == [] and vault.pending is None  # nothing touched


def test_vault_failure_stops_before_the_site() -> None:
    site, vault = FakeSite("old-password"), FakeVault(fail_save=True)
    assert _run(site, vault).step == Step.FAILED
    assert site.calls == []


def test_site_refusal_rolls_back() -> None:
    site, vault = FakeSite("old-password", fail_change=True), FakeVault()
    run = _run(site, vault)
    assert run.step == Step.ROLLED_BACK
    assert (site.password, vault.current, vault.pending) == ("old-password", "old-password", None)


def test_failed_verification_restores_the_old_password() -> None:
    site, vault = FakeSite("old-password", fail_verify_new=True), FakeVault()
    run = _run(site, vault)
    assert run.step == Step.ROLLED_BACK
    assert site.password == "old-password"
    assert vault.current == "old-password" and vault.pending is None


def test_incomplete_rollback_keeps_both_passwords() -> None:
    site = FakeSite("old-password", fail_verify_new=True, fail_restore=True)
    vault = FakeVault()
    run = _run(site, vault)
    assert run.step == Step.FAILED
    assert vault.pending == "new-password"  # kept: the site may use it
    assert "retour arrière incomplet" in (run.error or "")


def test_invalid_transitions_raise() -> None:
    run = RotationRun(urls=[], allowlist=frozenset())
    with pytest.raises(RotationError):
        run._move(Step.COMMITTED)


# --- policies, schedule, decisions ---------------------------------------------------------


@pytest.fixture
def keys(account: Account) -> Keyring:
    return account.keys()


def _engine(client: TestClient) -> Any:
    return client.app.state.engine  # type: ignore[attr-defined]


def _items(account: Account, keys: Keyring) -> tuple[dict[str, Any], dict[str, Any]]:
    personal = account.api.add(
        keys, {"v": 1, "type": "login", "name": "Banque", "password": "a" * 20}
    )
    agent = account.api.add(
        keys, {"v": 1, "type": "login", "name": "Netflix", "password": "b" * 20}
    )
    return personal, account.api.move(keys, agent, "agent")


def _policy(account: Account, item_id: str, **body: Any) -> dict[str, Any]:
    result: dict[str, Any] = account.api.call("PUT", f"/api/vault/items/{item_id}/policy", body)
    return result


def test_policies(account: Account, keys: Keyring) -> None:
    personal, agent = _items(account, keys)
    changed = (NOW - timedelta(days=100)).isoformat()
    out = _policy(account, agent["id"], frequency_days=90, mode="autonomous", changed_at=changed)
    assert out["next_due_at"].startswith((NOW - timedelta(days=10)).date().isoformat())
    # Personal zone: reminders only.
    with pytest.raises(ApiError) as exc:
        _policy(account, personal["id"], frequency_days=30, mode="autonomous")
    assert exc.value.status == 422
    assert (
        _policy(account, personal["id"], frequency_days=30, mode="approval")["frequency_days"] == 30
    )
    with pytest.raises(ApiError):
        _policy(account, agent["id"], frequency_days=45, mode="approval")


def test_schedule_never_touches_personal_entries(
    account: Account, keys: Keyring, client: TestClient
) -> None:
    personal, agent = _items(account, keys)
    old = (NOW - timedelta(days=400)).isoformat()
    _policy(account, agent["id"], frequency_days=30, mode="approval", changed_at=old)
    _policy(account, personal["id"], frequency_days=30, mode="approval", changed_at=old)
    with Session(_engine(client)) as db:
        report = rotations.run_schedule(db, datetime.now(UTC))
        assert (report.scheduled, report.reminders) == (1, 1)
        rotated = [r.item_id for r in db.exec(select(Rotation))]
        kinds = sorted((n.kind, n.item_id) for n in db.exec(select(Notification)))
    assert rotated == [agent["id"]]
    assert ("reminder.due", personal["id"]) in kinds
    assert ("rotation.due", agent["id"]) in kinds
    with Session(_engine(client)) as db:  # no duplicate on the next run
        again = rotations.run_schedule(db, datetime.now(UTC))
    assert (again.scheduled, again.reminders) == (0, 0)


def test_scheduling_a_personal_entry_is_impossible(
    account: Account, keys: Keyring, client: TestClient
) -> None:
    personal, _ = _items(account, keys)
    with Session(_engine(client)) as db:
        item = db.get(Item, personal["id"])
        assert item is not None
        with pytest.raises(rotations.RotationRefusedError, match="jamais une entrée personnelle"):
            rotations._schedule(db, item, PolicyMode.AUTONOMOUS, "manual", NOW)


def test_exposed_agent_password_schedules_a_rotation(
    account: Account, keys: Keyring, client: TestClient
) -> None:
    personal, agent = _items(account, keys)
    with Session(_engine(client)) as db:
        for item in (personal, agent):
            db.add(
                Breach(
                    user_id=account.user_id,
                    kind=BreachKind.PWNED_PASSWORD,
                    subject=item["id"],
                    item_id=item["id"],
                    source="agent",
                )
            )
        db.commit()
        rotations.run_schedule(db, datetime.now(UTC))
        triggered = [(r.item_id, r.trigger) for r in db.exec(select(Rotation))]
    assert triggered == [(agent["id"], "breach")]


def test_kill_switch_blocks_scheduling_and_approval(
    account: Account, keys: Keyring, client: TestClient
) -> None:
    _, agent = _items(account, keys)
    _policy(
        account,
        agent["id"],
        frequency_days=7,
        mode="approval",
        changed_at=(NOW - timedelta(days=30)).isoformat(),
    )
    account.api.call("POST", "/api/agent/kill-switch", {"engaged": True})
    with Session(_engine(client)) as db:
        assert rotations.run_schedule(db, datetime.now(UTC)).skipped
        assert db.exec(select(Rotation)).all() == []
    assert account.api.call("GET", "/api/agent/status")["kill_switch"] is True
    # Release needs the unlocked level.
    account.api.call("POST", "/api/auth/lock")
    with pytest.raises(ApiError) as exc:
        account.api.call("POST", "/api/agent/kill-switch", {"engaged": False})
    assert exc.value.status == 403
    account.api.call("POST", "/api/agent/kill-switch", {"engaged": True})  # engaging stays possible
    account.api.unlock("tristan", "une phrase de passe de test")
    account.api.call("POST", "/api/agent/kill-switch", {"engaged": False})
    with Session(_engine(client)) as db:
        actions = [a.action for a in db.exec(select(AuditLog))]
        assert killswitch.is_engaged(db) is False
    assert "agent.kill_switch.engage" in actions and "agent.kill_switch.release" in actions


def _scheduled(account: Account, keys: Keyring, client: TestClient) -> tuple[dict[str, Any], int]:
    _, agent = _items(account, keys)
    _policy(
        account,
        agent["id"],
        frequency_days=7,
        mode="approval",
        changed_at=(NOW - timedelta(days=30)).isoformat(),
    )
    with Session(_engine(client)) as db:
        rotations.run_schedule(db, datetime.now(UTC))
    rotation = account.api.call("GET", "/api/agent/rotations")[0]
    return agent, rotation["id"]


def test_approve_and_daily_limit(account: Account, keys: Keyring, client: TestClient) -> None:
    agent, rotation_id = _scheduled(account, keys, client)
    approved = account.api.call("POST", f"/api/agent/rotations/{rotation_id}/approve")
    assert approved["status"] == "approved"
    with pytest.raises(ApiError):  # already decided
        account.api.call("POST", f"/api/agent/rotations/{rotation_id}/approve")
    with Session(_engine(client)) as db:
        for _ in range(2):
            db.add(
                Rotation(
                    user_id=account.user_id,
                    item_id=agent["id"],
                    trigger="manual",
                    mode=PolicyMode.APPROVAL,
                    status=RotationStatus.APPROVED,
                    decided_at=datetime.now(UTC),
                )
            )
        extra = Rotation(
            user_id=account.user_id, item_id=agent["id"], trigger="manual", mode=PolicyMode.APPROVAL
        )
        db.add(extra)
        db.commit()
        db.refresh(extra)
        extra_id = extra.id
    with pytest.raises(ApiError) as exc:
        account.api.call("POST", f"/api/agent/rotations/{extra_id}/approve")
    assert "limite" in str(exc.value)


def test_refuse_postpones_the_next_due_date(
    account: Account, keys: Keyring, client: TestClient
) -> None:
    agent, rotation_id = _scheduled(account, keys, client)
    assert (
        account.api.call("POST", f"/api/agent/rotations/{rotation_id}/refuse")["status"]
        == "refused"
    )
    with Session(_engine(client)) as db:
        policy = db.get(RotationPolicy, agent["id"])
        assert policy is not None and policy.next_due_at is not None
        assert policy.next_due_at > datetime.now(UTC) + timedelta(days=6)


def test_reclaimed_entry_cannot_be_approved(
    account: Account, keys: Keyring, client: TestClient
) -> None:
    agent, rotation_id = _scheduled(account, keys, client)
    current = next(i for i in account.api.sync()["items"] if i["id"] == agent["id"])
    account.api.move(keys, current, "personal")
    with pytest.raises(ApiError) as exc:
        account.api.call("POST", f"/api/agent/rotations/{rotation_id}/approve")
    assert "plus confiée" in str(exc.value)


def test_events_stream_new_notifications(account: Account, client: TestClient) -> None:
    with Session(_engine(client)) as db:
        db.add(Notification(user_id=account.user_id, kind="breach.new", item_id=None))
        db.commit()
    headers = {"Cookie": f"serenity_session={account.api.token}", "Last-Event-ID": "0"}
    with client.stream("GET", "/api/events?max_seconds=0.5", headers=headers) as response:
        assert response.headers["content-type"].startswith("text/event-stream")
        body = "".join(response.iter_text())
    assert "event: notification" in body
    assert '"kind": "breach.new"' in body
