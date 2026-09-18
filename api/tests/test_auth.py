"""Accounts and authentication, end to end through the API with the reference client."""

import re
import sqlite3

import nacl.utils
import pytest
from fastapi.testclient import TestClient

from serenity.config import Settings
from serenity.crypto import blocks, contexts, sealed
from serenity.crypto.encoding import b64url_decode, b64url_encode
from serenity.devclient import ApiError, Client
from tests.conftest import PASSWORD, USERNAME, Account, Clock


def _status(fn: object, *args: object) -> int:
    try:
        fn(*args)  # type: ignore[operator]
    except ApiError as exc:
        return exc.status
    return 200


# --- signup --------------------------------------------------------------------------


def test_signup_needs_the_agent(client: TestClient) -> None:
    with pytest.raises(ApiError) as exc:
        Client(client).call("POST", "/api/auth/signup", _signup_body(nacl.utils.random(32)))
    assert exc.value.status == 503


def test_signup_then_registration_closes(account: Account, client: TestClient) -> None:
    assert account.api.call("GET", "/api/auth/me")["user_id"] == account.user_id
    assert Client(client).call("GET", "/api/auth/status") == {"registration_open": False}
    other = Client(client)
    with pytest.raises(ApiError) as exc:
        other.signup("quelquun", PASSWORD)
    assert exc.value.status == 403


def test_signup_is_pending_until_the_totp_code(
    client: TestClient, agent_ready: bytes, clock: Clock
) -> None:
    api = Client(client)
    out = api.signup(USERNAME, PASSWORD)
    with pytest.raises(ApiError) as exc:
        api.login(USERNAME, PASSWORD, "123456")
    assert exc.value.status == 401
    with pytest.raises(ApiError) as exc:
        api.confirm(out["user_id"], "000000")
    assert exc.value.status == 401
    assert Client(client).call("GET", "/api/auth/status") == {"registration_open": True}


@pytest.mark.parametrize(
    ("field", "value"),
    [
        ("uk_by_mk", b64url_encode(b"\x01\x01" + bytes(40))),
        ("ak_by_uk", "not base64 !"),
        ("auth_key", b64url_encode(bytes(31))),
        ("ak_sealed", b64url_encode(bytes(120))),
    ],
)
def test_signup_refuses_malformed_blocks(
    client: TestClient, agent_ready: bytes, field: str, value: str
) -> None:
    body = _signup_body(agent_ready)
    body[field] = value
    with pytest.raises(ApiError) as exc:
        Client(client).call("POST", "/api/auth/signup", body)
    assert exc.value.status == 422


def test_signup_refuses_weak_kdf_and_foreign_server_key(
    client: TestClient, agent_ready: bytes
) -> None:
    body = _signup_body(agent_ready)
    body["kdf"]["memlimit"] = 16 * 1024 * 1024
    assert _status(Client(client).call, "POST", "/api/auth/signup", body) == 422
    body = _signup_body(nacl.utils.random(32))  # sealed for another server key
    assert _status(Client(client).call, "POST", "/api/auth/signup", body) == 422


# --- prelogin and login -------------------------------------------------------------------


def test_prelogin_does_not_reveal_unknown_accounts(account: Account, client: TestClient) -> None:
    api = Client(client)
    real = api.call("POST", "/api/auth/prelogin", {"username": USERNAME})
    fake = api.call("POST", "/api/auth/prelogin", {"username": "personne"})
    assert fake == api.call("POST", "/api/auth/prelogin", {"username": "personne"})
    assert len(b64url_decode(fake["salt"])) == len(b64url_decode(real["salt"])) == 16
    assert (fake["memlimit"], fake["opslimit"]) == (real["memlimit"], real["opslimit"])
    assert fake["salt"] != api.call("POST", "/api/auth/prelogin", {"username": "autre"})["salt"]


def test_login_unwraps_the_same_keys_on_another_device(
    account: Account, client: TestClient
) -> None:
    keys = Client(client).login(USERNAME, PASSWORD, account.code())
    assert keys.user_id == account.user_id
    assert keys.ak_version == 1


def test_login_errors_are_identical(account: Account, client: TestClient) -> None:
    api = Client(client)
    wrong_password = _status(api.login, USERNAME, "une autre phrase de passe", account.code())
    wrong_code = _status(api.login, USERNAME, PASSWORD, "000000")
    assert wrong_password == wrong_code == 401


def test_totp_code_cannot_be_replayed(account: Account, client: TestClient) -> None:
    code = account.code()
    Client(client).login(USERNAME, PASSWORD, code)
    assert _status(Client(client).login, USERNAME, PASSWORD, code) == 401


def test_lockout_after_failures(account: Account, client: TestClient) -> None:
    api = Client(client)
    for _ in range(2):
        assert _status(api.login, USERNAME, "mauvaise phrase de passe", account.code()) == 401
    auth, _ = api.derive(USERNAME, "mauvaise phrase de passe")
    response = client.post(
        "/api/auth/login",
        json={"username": USERNAME, "auth_key": b64url_encode(auth), "totp": account.code()},
    )
    assert response.status_code == 429
    assert 0 < int(response.headers["retry-after"]) <= 60
    # Even the right credentials wait for the end of the lockout.
    assert _status(api.login, USERNAME, PASSWORD, account.code()) == 429


def test_session_cookie_is_hardened(account: Account, client: TestClient) -> None:
    api = Client(client)
    pre = api.derive(USERNAME, PASSWORD)
    response = client.post(
        "/api/auth/login",
        json={"username": USERNAME, "auth_key": b64url_encode(pre[0]), "totp": account.code()},
    )
    cookie = response.headers["set-cookie"].lower()
    for flag in ("httponly", "secure", "samesite=strict", "path=/api", f"max-age={60 * 86400}"):
        assert flag in cookie


# --- unlocked level, sessions ---------------------------------------------------------------


def test_sensitive_actions_need_an_unlocked_session(account: Account, client: TestClient) -> None:
    api = account.api
    other = Client(client)
    other.login(USERNAME, PASSWORD, account.code())
    sessions = api.call("GET", "/api/auth/sessions")
    assert len(sessions) == 2
    target = next(s["id"] for s in sessions if not s["current"])
    api.call("POST", "/api/auth/lock")
    assert _status(api.call, "DELETE", f"/api/auth/sessions/{target}") == 403
    assert _status(api.unlock, USERNAME, "mauvaise phrase de passe") == 401
    api.unlock(USERNAME, PASSWORD)
    api.call("DELETE", f"/api/auth/sessions/{target}")
    assert _status(other.call, "GET", "/api/auth/me") == 401


def test_logout(account: Account) -> None:
    account.api.call("POST", "/api/auth/logout")
    assert _status(account.api.call, "GET", "/api/auth/me") == 401


# --- master password change and recovery ------------------------------------------------------


def test_change_master_password(account: Account, client: TestClient) -> None:
    other = Client(client)
    before = other.login(USERNAME, PASSWORD, account.code())
    account.api.change_password(USERNAME, PASSWORD, "nouvelle phrase de passe", account.code())
    assert _status(other.call, "GET", "/api/auth/me") == 401  # other devices logged out
    assert _status(Client(client).login, USERNAME, PASSWORD, account.code()) == 401
    after = Client(client).login(USERNAME, "nouvelle phrase de passe", account.code())
    assert (after.uk, after.ak) == (before.uk, before.ak)  # entries stay readable


def test_recovery_with_the_kit(account: Account, client: TestClient) -> None:
    before = Client(client).login(USERNAME, PASSWORD, account.code())
    api = Client(client)
    new_kit = api.recover(
        USERNAME, account.recovery_kit.lower(), account.code(), "phrase après récupération"
    )
    assert new_kit != account.recovery_kit
    assert _status(account.api.call, "GET", "/api/auth/me") == 401  # every session revoked
    after = Client(client).login(USERNAME, "phrase après récupération", account.code())
    assert (after.uk, after.ak) == (before.uk, before.ak)
    # The old kit is dead, the new one works.
    old = _status(Client(client).recover, USERNAME, account.recovery_kit, account.code(), "x" * 20)
    assert old == 401
    Client(client).recover(USERNAME, new_kit, account.code(), "encore une autre phrase")


def test_recovery_needs_the_totp(account: Account, client: TestClient) -> None:
    assert (
        _status(Client(client).recover, USERNAME, account.recovery_kit, "000000", "x" * 20) == 401
    )


# --- audit and secrets ---------------------------------------------------------------------------


def test_logins_are_audited_per_user(account: Account, client: TestClient) -> None:
    _status(Client(client).login, USERNAME, "mauvaise phrase de passe", account.code())
    Client(client).login(USERNAME, PASSWORD, account.code())
    logs = account.api.call("GET", "/api/logs")
    actions = {(log["action"], log["outcome"]) for log in logs}
    assert {("auth.signup", "pending"), ("auth.signup.confirm", "success")} <= actions
    assert {("auth.login", "failure"), ("auth.login", "success")} <= actions


def test_no_secret_in_database(account: Account, settings: Settings, client: TestClient) -> None:
    keys = Client(client).login(USERNAME, PASSWORD, account.code())
    auth, mek = Client(client).derive(USERNAME, PASSWORD)
    raw = settings.db_path.read_bytes() + _wal(settings)
    for secret in (keys.uk, keys.ak, auth, mek, PASSWORD.encode(), account.totp_secret.encode()):
        assert secret not in raw
    assert b64url_encode(auth).encode() not in raw
    compact_kit = re.sub("-", "", account.recovery_kit).encode()
    assert compact_kit not in raw


def _wal(settings: Settings) -> bytes:
    wal = settings.db_path.with_name(settings.db_path.name + "-wal")
    with sqlite3.connect(settings.db_path) as conn:
        conn.execute("PRAGMA wal_checkpoint(FULL)")
    return wal.read_bytes() if wal.exists() else b""


def _signup_body(server_seed: bytes) -> dict:  # type: ignore[type-arg]
    import uuid

    user_id = str(uuid.uuid4())
    uk, ak = nacl.utils.random(32), nacl.utils.random(32)
    pk, _ = sealed.server_keypair(server_seed)
    new = Client.new_password(user_id, PASSWORD, uk)
    return {
        "user_id": user_id,
        "username": USERNAME,
        **new.body,
        "recovery_auth_key": b64url_encode(nacl.utils.random(32)),
        "uk_by_rk": b64url_encode(
            blocks.wrap_key(nacl.utils.random(32), uk, contexts.uk_by_rk(user_id))
        ),
        "ak_by_uk": b64url_encode(blocks.wrap_key(uk, ak, contexts.ak_by_uk(user_id, 1))),
        "ak_sealed": b64url_encode(sealed.seal_for_server(pk, ak, contexts.ak_by_sk(user_id, 1))),
    }


@pytest.mark.parametrize("name", ["Tristan.Joncour+serenity@Exemple.fr", "tri", "a_b-c.d"])
def test_usernames_accept_emails(name: str) -> None:
    from serenity.auth.validation import normalize_username

    assert normalize_username(name) == name.lower()


@pytest.mark.parametrize(
    "name", ["ab", "tristan@gmail;com", "a@b@c", "tristan@", "-tristan", "a b"]
)
def test_usernames_refuse_malformed(name: str) -> None:
    from serenity.auth.validation import InvalidInputError, normalize_username

    with pytest.raises(InvalidInputError):
        normalize_username(name)


def test_signup_with_an_email_identifier(
    client: TestClient, agent_ready: bytes, clock: Clock
) -> None:
    api = Client(client)
    out = api.signup("Tristan@Exemple.fr", PASSWORD)
    import pyotp

    clock.tick()
    api.confirm(out["user_id"], pyotp.TOTP(out["totp_secret"]).at(int(clock.now)))
    clock.tick()
    keys = Client(client).login(
        "tristan@exemple.fr", PASSWORD, pyotp.TOTP(out["totp_secret"]).at(int(clock.now))
    )
    assert keys.user_id == out["user_id"]
