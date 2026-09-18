"""Server-side sessions. The cookie holds a random token; SQLite only stores its HMAC."""

import hashlib
import hmac
import secrets
from datetime import datetime, timedelta

from sqlmodel import Session, col, delete, select

from serenity.models import AuthSession

COOKIE_NAME = "serenity_session"


def _hash(token: str, key: str) -> str:
    return hmac.new(key.encode(), token.encode(), hashlib.sha256).hexdigest()


def create_session(session: Session, key: str, now: datetime, ttl: timedelta) -> str:
    """Create a session and return the token to put in the cookie."""
    purge_expired(session, now)
    token = secrets.token_urlsafe(32)
    session.add(AuthSession(token_hash=_hash(token, key), created_at=now, expires_at=now + ttl))
    session.commit()
    return token


def get_session(session: Session, key: str, token: str, now: datetime) -> AuthSession | None:
    row = session.exec(
        select(AuthSession).where(AuthSession.token_hash == _hash(token, key))
    ).first()
    if row is None or row.expires_at <= now:
        return None
    return row


def revoke_session(session: Session, key: str, token: str) -> None:
    session.exec(delete(AuthSession).where(col(AuthSession.token_hash) == _hash(token, key)))
    session.commit()


def purge_expired(session: Session, now: datetime) -> None:
    session.exec(delete(AuthSession).where(col(AuthSession.expires_at) <= now))
