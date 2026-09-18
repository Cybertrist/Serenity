"""Breach watch: rules, k-anonymity, alerts without duplicates, agent-zone scan, kill switch."""

import json
from datetime import UTC, datetime, timedelta
from pathlib import Path
from typing import Any

import httpx
import pytest
from fastapi.testclient import TestClient
from sqlmodel import Session, select

from serenity.agent.killswitch import KILL_SWITCH
from serenity.agent.watch import run_watch
from serenity.devclient import ApiError, Keyring
from serenity.models import (
    AuditLog,
    Breach,
    BreachKind,
    BreachStatus,
    Notification,
    Setting,
    WatchedEmail,
)
from serenity.watcher import rules
from serenity.watcher.checks import ScannedEntry, analyze
from serenity.watcher.hibp import Hibp
from serenity.watcher.pwned import PwnedPasswords, sha1_hex
from tests.conftest import Account

VECTORS = next(
    p
    for p in (
        Path(__file__).resolve().parents[2] / "shared/test-vectors",
        Path("/shared/test-vectors"),
    )
    if p.is_dir()
)
NOW = datetime(2026, 9, 18, 12, 0, tzinfo=UTC)
LEAKED = "password123"  # sample value served by the fake Pwned Passwords API


class FakePwned(httpx.MockTransport):
    """Pwned Passwords double: records every requested URL."""

    def __init__(self) -> None:
        self.urls: list[str] = []
        super().__init__(self.handle)

    def handle(self, request: httpx.Request) -> httpx.Response:
        self.urls.append(str(request.url))
        assert request.headers.get("Add-Padding") == "true"
        digest = sha1_hex(LEAKED)
        body = "0000000000000000000000000000000000A:0\r\n"  # padding line
        if request.url.path.endswith(digest[:5]):
            body += f"{digest[5:]}:42\r\n"
        return httpx.Response(200, text=body)


def _pwned(transport: FakePwned) -> PwnedPasswords:
    return PwnedPasswords(httpx.Client(transport=transport))


# --- shared rules ------------------------------------------------------------------------


def test_rules_match_the_shared_vectors() -> None:
    data = json.loads((VECTORS / "watch.json").read_text(encoding="utf-8"))
    assert data["min_length"] == rules.MIN_LENGTH
    for case in data["passwords"]:
        assert rules.is_weak(case["password"]) is case["weak"], case["password"]
        assert round(rules.strength_bits(case["password"]), 6) == case["bits"]
        if case["sha1"]:
            assert sha1_hex(case["password"]) == case["sha1"]
    for case in data["old"]:
        changed = rules.parse_date(case["changed_at"])
        assert rules.is_old(changed, rules.parse_date(case["now"]) or NOW) is case["old"]


# --- k-anonymity -------------------------------------------------------------------------


def test_only_the_five_character_prefix_leaves() -> None:
    transport = FakePwned()
    pwned = _pwned(transport)
    assert pwned.occurrences(LEAKED) == 42
    assert pwned.occurrences("un-mot-de-passe-jamais-vu-9") == 0
    digest_leaked, digest_other = sha1_hex(LEAKED), sha1_hex("un-mot-de-passe-jamais-vu-9")
    for url in transport.urls:
        tail = url.rsplit("/", 1)[1]
        assert len(tail) == 5
        assert digest_leaked[5:] not in url and digest_other[5:] not in url
        assert LEAKED not in url
    assert {u.rsplit("/", 1)[1] for u in transport.urls} == {digest_leaked[:5], digest_other[:5]}


def test_ranges_are_cached_per_scan() -> None:
    transport = FakePwned()
    pwned = _pwned(transport)
    pwned.occurrences(LEAKED)
    pwned.occurrences(LEAKED)
    assert len(transport.urls) == 1


# --- analysis ----------------------------------------------------------------------------


def _scanned(item_id: str, password: str, changed: str | None = None) -> ScannedEntry:
    entry: dict[str, Any] = {"v": 1, "type": "login", "name": "x", "password": password}
    if changed:
        entry["passwordChangedAt"] = changed
    return ScannedEntry(item_id, entry, NOW - timedelta(days=10))


def test_analyze_finds_every_kind() -> None:
    strong = "x7Kq-m2Pz-9Lw4-rT8v"
    alerts = analyze(
        [
            _scanned("a", LEAKED),
            _scanned("b", strong),
            _scanned("c", strong),
            _scanned("d", "k9#Lm2$pQ7!xZ4&w", "2024-01-01T00:00:00.000Z"),
            _scanned("e", ""),
        ],
        NOW,
        _pwned(FakePwned()),
    )
    found = {(a.item_id, a.kind) for a in alerts}
    assert found == {
        ("a", BreachKind.WEAK),
        ("a", BreachKind.PWNED_PASSWORD),
        ("b", BreachKind.REUSED),
        ("c", BreachKind.REUSED),
        ("d", BreachKind.OLD),
    }


# --- API: browser reports ----------------------------------------------------------------


@pytest.fixture
def keys(account: Account) -> Keyring:
    return account.keys()


def _report(account: Account, scanned: list[str], alerts: list[tuple[str, str]]) -> dict[str, Any]:
    body = {"scanned": scanned, "alerts": [{"item_id": i, "kind": k} for i, k in alerts]}
    result: dict[str, Any] = account.api.call("POST", "/api/watch/report", body)
    return result


def test_report_opens_dedupes_and_resolves(account: Account, keys: Keyring) -> None:
    a = account.api.add(keys, {"v": 1, "type": "login", "name": "A", "password": "x"})["id"]
    b = account.api.add(keys, {"v": 1, "type": "login", "name": "B", "password": "y"})["id"]
    assert _report(account, [a, b], [(a, "weak"), (b, "weak")]) == {
        "new": 2,
        "open": 2,
        "resolved": 0,
    }
    # Same scan again: nothing new, no duplicate.
    assert _report(account, [a, b], [(a, "weak"), (b, "weak")])["new"] == 0
    assert len(account.api.call("GET", "/api/breaches")) == 2
    # B fixed: its alert is resolved.
    assert _report(account, [a, b], [(a, "weak")]) == {"new": 0, "open": 1, "resolved": 1}
    notifications = account.api.call("GET", "/api/notifications")
    assert [n["kind"] for n in notifications] == ["breach.new", "breach.new"]


def test_dismissed_alert_comes_back_only_after_a_change(account: Account, keys: Keyring) -> None:
    item = account.api.add(keys, {"v": 1, "type": "login", "name": "A", "password": "x"})
    _report(account, [item["id"]], [(item["id"], "weak")])
    breach = account.api.call("GET", "/api/breaches")[0]
    account.api.call("POST", f"/api/breaches/{breach['id']}/dismiss")
    assert _report(account, [item["id"]], [(item["id"], "weak")])["new"] == 0
    account.api.edit(keys, item, {"v": 1, "type": "login", "name": "A", "password": "z"})
    assert _report(account, [item["id"]], [(item["id"], "weak")])["new"] == 1


def test_report_refuses_foreign_or_unknown_entries(account: Account) -> None:
    unknown = "0f0c7a9e-1b2c-4d5e-8f90-123456789abc"
    with pytest.raises(ApiError) as exc:
        _report(account, [unknown], [(unknown, "weak")])
    assert exc.value.status == 422


def test_report_needs_the_unlocked_level(account: Account, keys: Keyring) -> None:
    item = account.api.add(keys, {"v": 1, "type": "login", "name": "A", "password": "x"})
    account.api.call("POST", "/api/auth/lock")
    with pytest.raises(ApiError) as exc:
        _report(account, [item["id"]], [])
    assert exc.value.status == 403


def test_notifications_read(account: Account, keys: Keyring) -> None:
    item = account.api.add(keys, {"v": 1, "type": "login", "name": "A", "password": "x"})
    _report(account, [item["id"]], [(item["id"], "weak")])
    first = account.api.call("GET", "/api/notifications")[0]
    assert account.api.call("GET", f"/api/notifications?since={first['id']}") == []
    assert account.api.call("POST", f"/api/notifications/{first['id']}/read")["read_at"] is not None


# --- agent zone, server side --------------------------------------------------------------


def _engine(client: TestClient) -> Any:
    return client.app.state.engine  # type: ignore[attr-defined]


def test_agent_watch_scans_the_agent_zone_only(
    account: Account, keys: Keyring, client: TestClient, agent_ready: bytes
) -> None:
    secret_perso = "mot-de-passe-perso-jamais-envoye-7"  # gitleaks:allow (sample test value)
    personal = account.api.add(
        keys, {"v": 1, "type": "login", "name": "Banque", "password": secret_perso}
    )
    delegated = account.api.add(
        keys, {"v": 1, "type": "login", "name": "Netflix", "password": LEAKED}
    )
    delegated = account.api.move(keys, delegated, "agent")
    transport = FakePwned()
    report = run_watch(_engine(client), agent_ready, _pwned(transport), None, NOW)
    assert report.users == 1
    with Session(_engine(client)) as db:
        found = {(b.item_id, b.kind, b.source) for b in db.exec(select(Breach))}
    assert found == {
        (delegated["id"], BreachKind.WEAK, "agent"),
        (delegated["id"], BreachKind.PWNED_PASSWORD, "agent"),
    }
    assert all(item != personal["id"] for item, _, _ in found)
    # The personal password never reaches the checks: not even its 5-character prefix leaves.
    assert [u.rsplit("/", 1)[1] for u in transport.urls] == [sha1_hex(LEAKED)[:5]]
    assert sha1_hex(secret_perso)[:5] != sha1_hex(LEAKED)[:5]


def test_agent_watch_does_not_resolve_client_reuse(
    account: Account, keys: Keyring, client: TestClient, agent_ready: bytes
) -> None:
    strong = "x7Kq-m2Pz-9Lw4-rT8v"
    added = account.api.add(keys, {"v": 1, "type": "login", "name": "N", "password": strong})
    item = account.api.move(keys, added, "agent")
    other = account.api.add(keys, {"v": 1, "type": "login", "name": "B", "password": strong})
    _report(account, [item["id"], other["id"]], [(item["id"], "reused"), (other["id"], "reused")])
    run_watch(_engine(client), agent_ready, _pwned(FakePwned()), None, NOW)
    with Session(_engine(client)) as db:
        reused = db.exec(select(Breach).where(Breach.item_id == item["id"])).one()
    assert reused.status == BreachStatus.OPEN


def test_kill_switch_stops_the_watch(
    account: Account, keys: Keyring, client: TestClient, agent_ready: bytes
) -> None:
    account.api.move(
        keys,
        account.api.add(keys, {"v": 1, "type": "login", "name": "N", "password": LEAKED}),
        "agent",
    )
    with Session(_engine(client)) as db:
        db.add(Setting(key=KILL_SWITCH, value={"engaged": True}))
        db.commit()
    transport = FakePwned()
    report = run_watch(_engine(client), agent_ready, _pwned(transport), None, NOW)
    assert report.skipped
    assert transport.urls == []
    with Session(_engine(client)) as db:
        assert db.exec(select(Breach)).all() == []
        outcomes = [(a.action, a.outcome) for a in db.exec(select(AuditLog))]
    assert ("agent.watch", "skipped") in outcomes


def test_watched_emails_with_hibp(account: Account, client: TestClient, agent_ready: bytes) -> None:
    account.api.call("POST", "/api/watch/emails", {"email": "Tristan@Exemple.fr"})
    seen: list[httpx.Request] = []

    def handler(request: httpx.Request) -> httpx.Response:
        seen.append(request)
        return httpx.Response(200, json=[{"Name": "Adobe", "BreachDate": "2013-10-04"}])

    hibp = Hibp(httpx.Client(transport=httpx.MockTransport(handler)), "fake-key")
    run_watch(_engine(client), agent_ready, _pwned(FakePwned()), hibp, NOW)
    run_watch(_engine(client), agent_ready, _pwned(FakePwned()), hibp, NOW)  # no duplicate
    assert seen[0].headers["hibp-api-key"] == "fake-key"
    breaches = account.api.call("GET", "/api/breaches")
    assert [(b["kind"], b["details"]["breach"]) for b in breaches] == [("email_breach", "Adobe")]
    with Session(_engine(client)) as db:
        assert len(db.exec(select(Notification)).all()) == 1
        assert db.exec(select(WatchedEmail)).one().last_checked_at is not None
    emails = account.api.call("GET", "/api/watch/emails")
    assert emails["enabled"] is False  # no HIBP_API_KEY in the test settings
