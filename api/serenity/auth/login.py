"""Login use case: lockout check, password + TOTP verification, session creation, audit."""

from dataclasses import dataclass
from datetime import datetime, timedelta
from enum import StrEnum

from sqlmodel import Session

from serenity import audit
from serenity.auth import credentials, sessions, throttle
from serenity.config import Settings
from serenity.models import Actor, Setting

TOTP_STEP_KEY = "totp_last_step"


class LoginError(StrEnum):
    NOT_CONFIGURED = "not_configured"
    LOCKED = "locked"
    INVALID = "invalid"


@dataclass(frozen=True)
class LoginResult:
    token: str | None = None
    error: LoginError | None = None
    retry_after: datetime | None = None

    def __repr__(self) -> str:
        return f"LoginResult(error={self.error!r})"


def login(
    session: Session, settings: Settings, password: str, totp_code: str, now: datetime
) -> LoginResult:
    creds = credentials.load_credentials(settings.auth_file)
    if creds is None:
        return LoginResult(error=LoginError.NOT_CONFIGURED)

    until = throttle.locked_until(session, now)
    if until is not None:
        audit.record(session, Actor.USER, "auth.login", outcome="locked")
        return LoginResult(error=LoginError.LOCKED, retry_after=until)

    # Both factors are always checked so timing does not reveal which one failed.
    password_ok = credentials.verify_password(creds, password)
    step = credentials.totp_step(creds, totp_code, _last_totp_step(session), now.timestamp())
    if not password_ok or step is None:
        until = throttle.register_failure(
            session,
            now,
            settings.login_max_attempts,
            timedelta(minutes=settings.login_lockout_minutes),
        )
        details = {"lockout_until": until.isoformat()} if until else {}
        audit.record(session, Actor.USER, "auth.login", outcome="failure", details=details)
        if until is not None:
            return LoginResult(error=LoginError.LOCKED, retry_after=until)
        return LoginResult(error=LoginError.INVALID)

    throttle.reset(session, now)
    _save_totp_step(session, step, now)
    token = sessions.create_session(
        session,
        settings.secret_key.get_secret_value(),
        now,
        timedelta(hours=settings.session_ttl_hours),
    )
    audit.record(session, Actor.USER, "auth.login")
    return LoginResult(token=token)


def _last_totp_step(session: Session) -> int | None:
    row = session.get(Setting, TOTP_STEP_KEY)
    return None if row is None else int(row.value)


def _save_totp_step(session: Session, step: int, now: datetime) -> None:
    row = session.get(Setting, TOTP_STEP_KEY) or Setting(key=TOTP_STEP_KEY)
    row.value = step
    row.updated_at = now
    session.add(row)
    session.commit()
