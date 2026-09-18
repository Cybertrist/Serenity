"""Device sessions: the cookie holds a random token, the database only its HMAC."""

import hashlib
import hmac
import secrets
from datetime import datetime, timedelta

from sqlmodel import Session, col, delete, select

from serenity.config import Settings
from serenity.models import DeviceSession

COOKIE_NAME = "serenity_session"
MAX_DEVICE_LABEL = 120


def token_hash(settings: Settings, token: str) -> str:
    key = settings.secret_key.get_secret_value().encode()
    return hmac.new(key, token.encode(), hashlib.sha256).hexdigest()


def create(
    session: Session, settings: Settings, user_id: str, device: str, now: datetime
) -> tuple[str, DeviceSession]:
    """New device session, already unlocked (the master password was just proven)."""
    purge_expired(session, now)
    token = secrets.token_urlsafe(32)
    row = DeviceSession(
        user_id=user_id,
        token_hash=token_hash(settings, token),
        device=device[:MAX_DEVICE_LABEL],
        created_at=now,
        expires_at=now + timedelta(days=settings.device_session_days),
        last_seen_at=now,
        unlocked_until=now + timedelta(minutes=settings.unlock_minutes),
    )
    session.add(row)
    session.commit()
    session.refresh(row)
    return token, row


def find(session: Session, settings: Settings, token: str, now: datetime) -> DeviceSession | None:
    row = session.exec(
        select(DeviceSession).where(DeviceSession.token_hash == token_hash(settings, token))
    ).first()
    if row is None or row.expires_at <= now:
        return None
    return row


def is_unlocked(row: DeviceSession, now: datetime) -> bool:
    return row.unlocked_until is not None and row.unlocked_until > now


def touch(
    session: Session, settings: Settings, row: DeviceSession, now: datetime, *, slide: bool
) -> None:
    row.last_seen_at = now
    if slide and is_unlocked(row, now):
        row.unlocked_until = now + timedelta(minutes=settings.unlock_minutes)
    session.add(row)
    session.commit()


def unlock(session: Session, settings: Settings, row: DeviceSession, now: datetime) -> None:
    row.unlocked_until = now + timedelta(minutes=settings.unlock_minutes)
    row.last_seen_at = now
    session.add(row)
    session.commit()


def lock(session: Session, row: DeviceSession) -> None:
    row.unlocked_until = None
    session.add(row)
    session.commit()


def revoke(session: Session, session_id: int) -> None:
    session.exec(delete(DeviceSession).where(col(DeviceSession.id) == session_id))
    session.commit()


def revoke_all(session: Session, user_id: str, *, keep: int | None = None) -> int:
    query = delete(DeviceSession).where(col(DeviceSession.user_id) == user_id)
    if keep is not None:
        query = query.where(col(DeviceSession.id) != keep)
    result = session.exec(query)
    session.commit()
    return int(result.rowcount or 0)


def list_for(session: Session, user_id: str, now: datetime) -> list[DeviceSession]:
    return list(
        session.exec(
            select(DeviceSession)
            .where(DeviceSession.user_id == user_id, col(DeviceSession.expires_at) > now)
            .order_by(col(DeviceSession.last_seen_at).desc())
        )
    )


def purge_expired(session: Session, now: datetime) -> None:
    session.exec(delete(DeviceSession).where(col(DeviceSession.expires_at) <= now))
