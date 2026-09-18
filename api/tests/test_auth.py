import stat
import time
from datetime import timedelta

import pyotp
import pytest
from fastapi.testclient import TestClient
from sqlmodel import Session, select

from serenity.auth import credentials, sessions
from serenity.config import Settings
from serenity.models import AuthSession, utcnow
from tests.conftest import TEST_PASSWORD, TEST_TOTP_SECRET


def _code(offset_steps: int = 0) -> str:
    totp = pyotp.TOTP(TEST_TOTP_SECRET)
    return totp.at(int(time.time()) + offset_steps * totp.interval)


def _login(client: TestClient, password: str = TEST_PASSWORD, code: str | None = None) -> int:
    body = {"password": password, "totp": code or _code()}
    status: int = client.post("/api/auth/login", json=body).status_code
    return status


# --- credentials -------------------------------------------------------------


def test_credentials_file_is_private_and_hashed(enrolled: Settings) -> None:
    mode = stat.S_IMODE(enrolled.auth_file.stat().st_mode)
    assert mode == 0o600
    content = enrolled.auth_file.read_text()
    assert TEST_PASSWORD not in content
    assert "$argon2id$" in content


def test_short_password_is_refused() -> None:
    with pytest.raises(ValueError):
        credentials.create_credentials("short", TEST_TOTP_SECRET)


def test_credentials_repr_hides_secrets(enrolled: Settings) -> None:
    creds = credentials.load_credentials(enrolled.auth_file)
    assert creds is not None
    assert TEST_TOTP_SECRET not in repr(creds)


def test_totp_accepts_one_step_of_drift_and_refuses_replay(enrolled: Settings) -> None:
    creds = credentials.load_credentials(enrolled.auth_file)
    assert creds is not None
    now = time.time()
    step = credentials.totp_step(creds, _code(), None, now)
    assert step is not None
    assert credentials.totp_step(creds, _code(), step, now) is None
    assert credentials.totp_step(creds, _code(-1), None, now) is not None
    assert credentials.totp_step(creds, _code(-3), None, now) is None
    assert credentials.totp_step(creds, "abcdef", None, now) is None


# --- login API ---------------------------------------------------------------


def test_login_without_credentials_is_unavailable(client: TestClient) -> None:
    assert _login(client) == 503


def test_login_sets_a_hardened_cookie(enrolled: Settings, client: TestClient) -> None:
    response = client.post("/api/auth/login", json={"password": TEST_PASSWORD, "totp": _code()})
    assert response.status_code == 204
    cookie = response.headers["set-cookie"].lower()
    assert "httponly" in cookie
    assert "secure" in cookie
    assert "samesite=strict" in cookie
    assert "max-age=43200" in cookie
    assert "path=/api" in cookie
    assert client.get("/api/auth/me").status_code == 200


def test_protected_routes_require_a_session(client: TestClient) -> None:
    assert client.get("/api/auth/me").status_code == 401
    assert client.get("/api/logs").status_code == 401
    client.cookies.set(sessions.COOKIE_NAME, "forged", domain="testserver", path="/api")
    assert client.get("/api/auth/me").status_code == 401


def test_wrong_password_or_code_is_rejected(enrolled: Settings, client: TestClient) -> None:
    assert _login(client, password="wrong-password-123") == 401
    assert _login(client, code="000000" if _code() != "000000" else "111111") == 401


def test_totp_code_cannot_be_reused(enrolled: Settings, client: TestClient) -> None:
    code = _code()
    assert _login(client, code=code) == 204
    assert _login(client, code=code) == 401


def test_lockout_after_too_many_failures(enrolled: Settings, client: TestClient) -> None:
    # max attempts is 3 in tests
    assert _login(client, password="wrong-password-1") == 401
    assert _login(client, password="wrong-password-2") == 401
    response = client.post("/api/auth/login", json={"password": "wrong-3", "totp": _code()})
    assert response.status_code == 429
    assert int(response.headers["retry-after"]) > 0
    # Even the right credentials are refused during the lockout.
    assert _login(client) == 429


def test_logout_revokes_the_session(enrolled: Settings, client: TestClient) -> None:
    assert _login(client) == 204
    token = client.cookies.get(sessions.COOKIE_NAME)
    assert client.post("/api/auth/logout").status_code == 204
    assert token is not None
    client.cookies.set(sessions.COOKIE_NAME, token, domain="testserver", path="/api")
    assert client.get("/api/auth/me").status_code == 401


def test_expired_session_is_refused(db: Session) -> None:
    now = utcnow()
    token = sessions.create_session(db, "k" * 48, now - timedelta(hours=13), timedelta(hours=12))
    assert sessions.get_session(db, "k" * 48, token, now) is None


def test_only_token_hash_is_stored(db: Session) -> None:
    token = sessions.create_session(db, "k" * 48, utcnow(), timedelta(hours=1))
    row = db.exec(select(AuthSession)).one()
    assert row.token_hash != token
    assert token not in row.token_hash


def test_login_is_audited_without_secrets(enrolled: Settings, client: TestClient) -> None:
    code = _code()
    assert _login(client, password="wrong-password-1") == 401
    assert _login(client, code=code) == 204
    logs = client.get("/api/logs").json()
    actions = [(log["action"], log["outcome"]) for log in logs]
    assert ("auth.login", "success") in actions
    assert ("auth.login", "failure") in actions
    raw = enrolled.db_path.read_bytes()
    assert TEST_PASSWORD.encode() not in raw
    assert TEST_TOTP_SECRET.encode() not in raw


def test_audit_log_is_read_only_through_the_api(enrolled: Settings, client: TestClient) -> None:
    assert _login(client) == 204
    assert client.delete("/api/logs").status_code == 405
    assert client.post("/api/logs", json={}).status_code == 405
