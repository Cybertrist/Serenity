"""The rotation executor, without a browser: guards, client, and the vault transaction."""

import httpx
import pyotp
import pytest
from sqlalchemy import Engine
from sqlmodel import Session, desc, select

from serenity.agent.executor import _pick_recipe
from serenity.agent.watch import open_agent_key
from serenity.models import AgentKey, Item, User, Zone, utcnow
from serenity.rotator.base import Credentials, RotationError, RotationRun, Step
from serenity.rotator.passwords import CLASSES, new_password
from serenity.rotator.remote import RemoteSiteRotator, totp_code
from serenity.rotator.vault import AgentVault
from serenity.vault import service
from serenity.vault.errors import InvalidRequestError
from tests.conftest import Account

DEMO_DOMAINS = {"demo": frozenset({"demo.serenity.test"})}
# Throwaway value for the fake entries below.
DEMO_SECRET = "mot-de-passe"


# --- what the agent generates -------------------------------------------------------------


def test_a_rotated_password_is_long_and_mixed() -> None:
    passwords = {new_password() for _ in range(50)}
    assert len(passwords) == 50  # no repeat: it comes from the system CSPRNG
    for password in passwords:
        assert len(password) == 24
        assert all(any(c in klass for c in password) for klass in CLASSES)


def test_a_rotated_password_is_never_short() -> None:
    with pytest.raises(ValueError, match="12 characters"):
        new_password(8)


# --- codes carried by the entry ------------------------------------------------------------


def test_totp_from_a_secret_and_from_an_uri() -> None:
    secret = pyotp.random_base32()
    expected = pyotp.TOTP(secret).at(1_900_000_000)
    assert totp_code(secret, 1_900_000_000) == expected
    uri = f"otpauth://totp/Démo:tristan?secret={secret}&issuer=Démo"
    assert totp_code(uri, 1_900_000_000) == expected


@pytest.mark.parametrize("value", ["", "   ", "pas-du-base32!", "otpauth://hotp/x?secret=AAAA"])
def test_a_missing_or_broken_code_is_no_code(value: str) -> None:
    assert totp_code(value) is None


# --- choosing a recipe ----------------------------------------------------------------------


def test_the_recipe_matches_every_url_of_the_entry() -> None:
    assert _pick_recipe(["https://demo.serenity.test/connexion"], DEMO_DOMAINS) == "demo"
    assert _pick_recipe(["https://www.demo.serenity.test/x"], DEMO_DOMAINS) == "demo"
    # One URL outside the recipe is enough to refuse it.
    assert (
        _pick_recipe(["https://demo.serenity.test/x", "https://ailleurs.fr"], DEMO_DOMAINS) is None
    )
    assert _pick_recipe([], DEMO_DOMAINS) is None
    assert _pick_recipe(["https://demo.serenity.test.evil.example/x"], DEMO_DOMAINS) is None


# --- the client of the executor --------------------------------------------------------------


def rotator(handler: object, **kwargs: object) -> RemoteSiteRotator:
    transport = httpx.MockTransport(handler)  # type: ignore[arg-type]
    defaults = {
        "base_url": "http://rotator:8000",
        "token": "jeton",
        "recipe": "demo",
        "site_url": "https://demo.serenity.test/connexion",
        "domains": frozenset({"demo.serenity.test"}),
        "client": httpx.Client(transport=transport),
    }
    return RemoteSiteRotator(**{**defaults, **kwargs})  # type: ignore[arg-type]


def test_the_client_carries_the_token_and_never_the_recipe_of_another_site() -> None:
    seen: dict[str, object] = {}

    def handler(request: httpx.Request) -> httpx.Response:
        seen["auth"] = request.headers.get("authorization")
        seen["path"] = request.url.path
        return httpx.Response(200, json={"ok": True})

    site = rotator(handler)
    site.login(Credentials("tristan", "un-mot-de-passe"))
    assert seen == {"auth": "Bearer jeton", "path": "/verify"}


def test_a_code_is_added_only_when_the_entry_has_one() -> None:
    bodies: list[dict[str, object]] = []

    def handler(request: httpx.Request) -> httpx.Response:
        import json

        bodies.append(json.loads(request.content))
        return httpx.Response(200, json={"ok": True})

    rotator(handler).login(Credentials("tristan", "x"))
    rotator(handler, totp_uri=pyotp.random_base32()).login(Credentials("tristan", "x"))
    assert "totp" not in bodies[0]
    assert len(str(bodies[1]["totp"])) == 6


def test_a_site_failure_is_an_error_with_a_safe_message() -> None:
    site = rotator(lambda request: httpx.Response(200, json={"ok": False, "error": "refusé"}))
    with pytest.raises(RotationError, match="refusé"):
        site.change_password(Credentials("tristan", "x"), "un-nouveau-mot-de-passe")
    assert site.verify(Credentials("tristan", "x")) is False


def test_an_unreachable_executor_is_an_error_not_a_crash() -> None:
    def boom(request: httpx.Request) -> httpx.Response:
        raise httpx.ConnectError("nope")

    with pytest.raises(RotationError, match="rotateur injoignable"):
        rotator(boom).login(Credentials("tristan", "x"))


def test_an_http_error_from_the_executor_is_refused() -> None:
    site = rotator(lambda request: httpx.Response(500, json={}))
    with pytest.raises(RotationError, match="réponse 500"):
        site.login(Credentials("tristan", "x"))


# --- the vault side of the transaction ---------------------------------------------------------


def agent_item(account: Account, engine: Engine, password: str = DEMO_SECRET) -> tuple[str, bytes]:
    """An entry confided to the agent, plus the agent key that opens it."""
    keys = account.keys()
    entry = {
        "v": 1,
        "type": "login",
        "name": "Démo",
        "username": "tristan",
        "password": password,
        "urls": ["https://demo.serenity.test/connexion"],
    }
    item = account.api.move(keys, account.api.add(keys, entry), "agent")
    return item["id"], keys.ak


def test_a_pending_block_holds_the_next_revision_without_moving_the_entry(
    account: Account, engine: Engine, agent_ready: bytes
) -> None:
    item_id, ak = agent_item(account, engine)
    with Session(engine) as session:
        item = session.get(Item, item_id)
        assert item is not None
        before = item.revision
        vault = AgentVault(session=session, item=item, ak=ak, now=utcnow())
        vault.open()
        vault.save_pending("un-tout-nouveau-mot-de-passe")
        assert vault.item.revision == before  # the active entry has not moved
        assert vault.item.pending_revision == before + 1
        assert vault.item.pending_block is not None

        vault.commit_pending()
        assert vault.item.revision == before + 1
        assert vault.item.pending_block is None

    # A device reads the new password, and the old one is in the history.
    keys = account.keys()
    fresh = next(i for i in account.api.sync()["items"] if i["id"] == item_id)
    assert account.api.decrypt(keys, fresh)["password"] == "un-tout-nouveau-mot-de-passe"
    history = account.api.history(keys, item_id)
    assert history[0]["entry"]["password"] == DEMO_SECRET


def test_a_discarded_pending_block_leaves_no_trace(
    account: Account, engine: Engine, agent_ready: bytes
) -> None:
    item_id, ak = agent_item(account, engine)
    with Session(engine) as session:
        item = session.get(Item, item_id)
        assert item is not None
        vault = AgentVault(session=session, item=item, ak=ak, now=utcnow())
        vault.open()
        vault.save_pending("celui-ci-ne-servira-jamais")
        vault.discard_pending()
        assert vault.item.pending_block is None and vault.item.pending_revision is None
        assert vault.item.revision == 2  # 1 (created) then 2 (delegated): untouched by us

    keys = account.keys()
    fresh = next(i for i in account.api.sync()["items"] if i["id"] == item_id)
    assert account.api.decrypt(keys, fresh)["password"] == DEMO_SECRET


def test_an_entry_in_rotation_cannot_change_zone(
    account: Account, engine: Engine, agent_ready: bytes
) -> None:
    """docs/crypto.md §7.12: a reclaim would leave the pending agent block behind."""
    item_id, ak = agent_item(account, engine)
    with Session(engine) as session:
        item = session.get(Item, item_id)
        assert item is not None
        vault = AgentVault(session=session, item=item, ak=ak, now=utcnow())
        vault.open()
        vault.save_pending("pendant-ce-temps")
        with pytest.raises(InvalidRequestError, match="Rotation en cours"):
            service.change_zone(
                session, item.user_id, item_id, vault.item.revision, Zone.PERSONAL, b"x", utcnow()
            )


def test_the_agent_key_opens_what_the_agent_wrote(
    account: Account, engine: Engine, agent_ready: bytes
) -> None:
    """The pending block is a normal agent-zone block: the server key chain opens it."""
    item_id, _ = agent_item(account, engine)
    with Session(engine) as session:
        user = session.get(User, account.user_id)
        row = session.exec(
            select(AgentKey)
            .where(AgentKey.user_id == account.user_id)
            .order_by(desc(AgentKey.version))
        ).first()
        assert user is not None and row is not None
        ak = open_agent_key(user, row, agent_ready)
        item = session.get(Item, item_id)
        assert item is not None
        vault = AgentVault(session=session, item=item, ak=ak, now=utcnow())
        assert vault.open()["username"] == "tristan"


def test_the_transaction_never_touches_a_site_before_the_vault() -> None:
    """The order is the whole point of rule 6: pending saved, then the site."""
    calls: list[str] = []

    class Vault:
        def save_pending(self, new_password: str) -> None:
            calls.append("save_pending")

        def commit_pending(self) -> None:
            calls.append("commit_pending")

        def discard_pending(self) -> None:
            calls.append("discard_pending")

    class Site:
        domains = frozenset({"demo.serenity.test"})

        def login(self, credentials: Credentials) -> None:
            calls.append("login")

        def change_password(self, current: Credentials, new_password: str) -> None:
            calls.append("change_password")

        def verify(self, credentials: Credentials) -> bool:
            calls.append("verify")
            return True

    run = RotationRun(
        urls=["https://demo.serenity.test/connexion"], allowlist=frozenset({"demo.serenity.test"})
    )
    step = run.execute(Site(), Vault(), Credentials("tristan", "avant"), "apres-la-rotation")
    assert step == Step.COMMITTED
    assert calls == ["save_pending", "login", "change_password", "verify", "commit_pending"]
