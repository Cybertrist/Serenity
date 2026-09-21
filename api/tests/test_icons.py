"""Site icons: what the agent fetches, what it refuses to fetch, and what the api may serve."""

from typing import Any

import httpx
import pytest
from fastapi.testclient import TestClient
from sqlmodel import Session, select

from serenity.agent.icons import (
    ICON_USER_AGENT,
    MAX_ICON_BYTES,
    IconError,
    fetch_icon,
    is_public,
    run_icons,
    sniff,
)
from serenity.agent.killswitch import KILL_SWITCH
from serenity.crypto import contexts
from serenity.crypto.blocks import decrypt_block
from serenity.crypto.encoding import b64url_decode
from serenity.crypto.errors import CryptoError
from serenity.devclient import Keyring
from serenity.models import AuditLog, ItemIcon, Setting
from tests.conftest import Account
from tests.test_watch import NOW

PNG = b"\x89PNG\r\n\x1a\n" + b"a fake but well-formed enough body"
# A hostname that is an IP literal: no DNS, so the checks below never depend on a resolver.
PUBLIC = "1.1.1.1"


@pytest.fixture
def keys(account: Account) -> Keyring:
    return account.keys()


def _engine(client: TestClient) -> Any:
    return client.app.state.engine  # type: ignore[attr-defined]


class FakeSite(httpx.MockTransport):
    """A site double. Records what was asked, answers what the test asked it to answer."""

    def __init__(self, routes: dict[str, httpx.Response]) -> None:
        self.routes = routes
        self.urls: list[str] = []
        super().__init__(self.handle)

    def handle(self, request: httpx.Request) -> httpx.Response:
        self.urls.append(str(request.url))
        assert request.headers.get("user-agent") == ICON_USER_AGENT
        return self.routes.get(str(request.url), httpx.Response(404))


def _client(site: FakeSite) -> httpx.Client:
    return httpx.Client(transport=site, headers={"user-agent": ICON_USER_AGENT})


# --- what may be reached ------------------------------------------------------------------


@pytest.mark.parametrize(
    "host",
    [
        "127.0.0.1",  # the agent itself
        "10.0.0.5",  # the docker networks
        "192.168.1.1",
        "172.17.0.2",
        "169.254.169.254",  # cloud metadata, the classic target
        "::1",
        "fd00::1",
        "0.0.0.0",  # noqa: S104 (a test value, not a bind address)
    ],
)
def test_private_addresses_are_refused(host: str) -> None:
    assert not is_public(host)


def test_a_public_address_is_allowed() -> None:
    assert is_public(PUBLIC)


def test_http_and_unresolvable_names_are_refused() -> None:
    site = FakeSite({})
    with _client(site) as http, pytest.raises(IconError):
        fetch_icon(http, "rotator:8000")
    # Nothing was even attempted: the check happens before the request.
    assert site.urls == []


def test_a_redirect_towards_the_private_network_is_refused() -> None:
    site = FakeSite(
        {
            f"https://{PUBLIC}/favicon.ico": httpx.Response(
                302, headers={"location": "https://127.0.0.1/favicon.ico"}
            ),
            f"https://{PUBLIC}/": httpx.Response(200, text="<html></html>"),
        }
    )
    with _client(site) as http, pytest.raises(IconError):
        fetch_icon(http, PUBLIC)
    assert "https://127.0.0.1/favicon.ico" not in site.urls


# --- what may be stored -------------------------------------------------------------------


def test_only_real_image_bytes_are_kept() -> None:
    assert sniff(PNG) == "image/png"
    assert sniff(b"\xff\xd8\xffdata") == "image/jpeg"
    assert sniff(b"RIFF1234WEBPdata") == "image/webp"
    assert sniff(b"\x00\x00\x01\x00data") == "image/x-icon"
    # An SVG is XML with scripts in it, and an HTML error page is not an icon.
    assert sniff(b"<svg xmlns='http://www.w3.org/2000/svg'></svg>") is None
    assert sniff(b"<!DOCTYPE html>") is None


def test_a_body_over_the_cap_is_dropped() -> None:
    huge = PNG + b"x" * MAX_ICON_BYTES
    site = FakeSite(
        {
            f"https://{PUBLIC}/favicon.ico": httpx.Response(200, content=huge),
            f"https://{PUBLIC}/": httpx.Response(200, text="<html></html>"),
        }
    )
    with _client(site) as http, pytest.raises(IconError):
        fetch_icon(http, PUBLIC)


def test_the_home_page_is_read_when_there_is_no_favicon_ico() -> None:
    site = FakeSite(
        {
            f"https://{PUBLIC}/": httpx.Response(
                200, text='<html><head><link rel="shortcut icon" href="/img/i.png"></head></html>'
            ),
            f"https://{PUBLIC}/img/i.png": httpx.Response(200, content=PNG),
        }
    )
    with _client(site) as http:
        assert fetch_icon(http, PUBLIC) == ("image/png", PNG)


# --- the agent run ------------------------------------------------------------------------


def _site() -> FakeSite:
    return FakeSite(
        {
            f"https://{PUBLIC}/favicon.ico": httpx.Response(200, content=PNG),
            f"https://{PUBLIC}/": httpx.Response(200, text="<html></html>"),
        }
    )


def _two_entries(account: Account, keys: Keyring) -> tuple[str, str]:
    """One entry in each zone, both pointing at the same site."""
    personal = account.api.add(
        keys,
        {"v": 1, "type": "login", "name": "Banque", "urls": [f"https://{PUBLIC}/connexion"]},
    )
    delegated = account.api.add(
        keys, {"v": 1, "type": "login", "name": "Netflix", "urls": [f"https://{PUBLIC}/"]}
    )
    delegated = account.api.move(keys, delegated, "agent")
    return personal["id"], delegated["id"]


def test_the_agent_fetches_the_agent_zone_only_and_stores_it_encrypted(
    account: Account, keys: Keyring, client: TestClient, agent_ready: bytes
) -> None:
    personal_id, agent_id = _two_entries(account, keys)
    site = _site()
    with _client(site) as http:
        report = run_icons(_engine(client), agent_ready, http, NOW)
    assert (report.users, report.fetched, report.failed) == (1, 1, 0)
    with Session(_engine(client)) as db:
        rows = db.exec(select(ItemIcon)).all()
    assert [row.item_id for row in rows] == [agent_id]
    row = rows[0]
    assert row.mime == "image/png" and row.block is not None
    # Encrypted at rest: a stolen database does not show which brands live in the vault.
    assert PNG not in row.block
    # And the client opens it with AK, at the icon context and no other.
    context = contexts.icon(keys.user_id, agent_id, row.version)
    assert decrypt_block(keys.ak, row.block, context) == PNG
    with pytest.raises(CryptoError):
        decrypt_block(keys.ak, row.block, contexts.item(keys.user_id, agent_id, "agent", 1))
    assert personal_id not in {row.item_id for row in rows}


def test_a_site_that_gives_nothing_is_not_asked_again(
    account: Account, keys: Keyring, client: TestClient, agent_ready: bytes
) -> None:
    _two_entries(account, keys)
    silent = FakeSite({})
    with _client(silent) as http:
        assert run_icons(_engine(client), agent_ready, http, NOW).failed == 1
    asked = len(silent.urls)
    assert asked > 0
    with _client(silent) as http:
        assert run_icons(_engine(client), agent_ready, http, NOW).failed == 0
    assert len(silent.urls) == asked


def test_the_journal_counts_without_naming_a_site(
    account: Account, keys: Keyring, client: TestClient, agent_ready: bytes
) -> None:
    _two_entries(account, keys)
    with _client(_site()) as http:
        run_icons(_engine(client), agent_ready, http, NOW)
    with Session(_engine(client)) as db:
        lines = [a for a in db.exec(select(AuditLog)) if a.action == "agent.icons"]
    assert [line.details for line in lines] == [{"fetched": 1, "failed": 0}]
    assert PUBLIC not in str([line.details for line in lines])


def test_the_kill_switch_stops_the_run(
    account: Account, keys: Keyring, client: TestClient, agent_ready: bytes
) -> None:
    _two_entries(account, keys)
    with Session(_engine(client)) as db:
        db.add(Setting(key=KILL_SWITCH, value={"engaged": True}))
        db.commit()
    site = _site()
    with _client(site) as http:
        report = run_icons(_engine(client), agent_ready, http, NOW)
    assert report.skipped and report.fetched == 0
    assert site.urls == []
    with Session(_engine(client)) as db:
        assert db.exec(select(ItemIcon)).all() == []
        outcomes = [(a.action, a.outcome) for a in db.exec(select(AuditLog))]
    assert ("agent.icons", "skipped") in outcomes


# --- the route ----------------------------------------------------------------------------


def test_the_api_serves_the_agent_zone_icons_of_this_account_only(
    account: Account, keys: Keyring, client: TestClient, agent_ready: bytes
) -> None:
    personal_id, agent_id = _two_entries(account, keys)
    with _client(_site()) as http:
        run_icons(_engine(client), agent_ready, http, NOW)
    icons = account.api.call("GET", "/api/vault/icons")
    assert [icon["item_id"] for icon in icons] == [agent_id]
    assert personal_id not in [icon["item_id"] for icon in icons]
    icon = icons[0]
    block = b64url_decode(icon["block"])
    assert decrypt_block(
        keys.ak, block, contexts.icon(keys.user_id, agent_id, icon["version"])
    ) == (PNG)


def test_a_deleted_entry_stops_showing_its_icon(
    account: Account, keys: Keyring, client: TestClient, agent_ready: bytes
) -> None:
    _, agent_id = _two_entries(account, keys)
    with _client(_site()) as http:
        run_icons(_engine(client), agent_ready, http, NOW)
    # Revision 2: the entry was delegated, which re-encrypts it.
    account.api.call("DELETE", f"/api/vault/items/{agent_id}?base_revision=2")
    assert account.api.call("GET", "/api/vault/icons") == []
