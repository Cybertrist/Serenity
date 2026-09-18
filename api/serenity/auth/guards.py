"""Throttled failure handling shared by every credential check."""

from datetime import datetime
from typing import NoReturn

from sqlmodel import Session

from serenity import audit
from serenity.auth import throttle
from serenity.auth.errors import AuthError, AuthErrorKind
from serenity.config import Settings
from serenity.models import Actor

LOCKED_MESSAGE = "Trop de tentatives. Réessaie plus tard."


def check_lock(session: Session, key: str, now: datetime, user_id: str | None) -> None:
    """Refuse early while `key` (e.g. login:<username>) is locked out."""
    until = throttle.locked_until(session, key, now)
    if until is not None:
        action = f"auth.{key.split(':', 1)[0]}"
        audit.record(session, Actor.USER, action, user_id=user_id, outcome="locked")
        raise AuthError(AuthErrorKind.LOCKED, LOCKED_MESSAGE, until)


def fail(
    session: Session,
    settings: Settings,
    key: str,
    now: datetime,
    user_id: str | None,
    action: str,
    message: str,
) -> NoReturn:
    """Count the failure, audit it, and raise INVALID (or LOCKED if it triggered a lockout)."""
    until = throttle.register_failure(session, settings, key, now)
    details = {"lockout_until": until.isoformat()} if until else {}
    audit.record(session, Actor.USER, action, user_id=user_id, outcome="failure", details=details)
    if until is not None:
        raise AuthError(AuthErrorKind.LOCKED, LOCKED_MESSAGE, until)
    raise AuthError(AuthErrorKind.INVALID, message)
