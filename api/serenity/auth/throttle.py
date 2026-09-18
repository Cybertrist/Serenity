"""Progressive lockout: after N failures, lock base * 2^(k-1) minutes, up to 24 hours."""

from datetime import datetime, timedelta

from sqlmodel import Session, col, delete

from serenity.config import Settings
from serenity.models import Throttle

MAX_LOCKOUT = timedelta(hours=24)
# Forget a key's history after a full day without failure.
FORGET_AFTER = timedelta(hours=24)


def locked_until(session: Session, key: str, now: datetime) -> datetime | None:
    row = session.get(Throttle, key)
    if row is None or row.locked_until is None or row.locked_until <= now:
        return None
    return row.locked_until


def register_failure(
    session: Session, settings: Settings, key: str, now: datetime
) -> datetime | None:
    """Count a failure. Returns the lockout end when this failure triggers one."""
    row = session.get(Throttle, key)
    if row is None or row.updated_at < now - FORGET_AFTER:
        row = row or Throttle(key=key)
        row.failures, row.lockouts = 0, 0
    row.failures += 1
    until = None
    if row.failures >= settings.login_max_attempts:
        row.lockouts += 1
        row.failures = 0
        minutes = settings.login_lockout_base_minutes * 2 ** min(row.lockouts - 1, 20)
        until = now + min(timedelta(minutes=minutes), MAX_LOCKOUT)
        row.locked_until = until
    row.updated_at = now
    session.add(row)
    session.commit()
    return until


def reset(session: Session, key: str) -> None:
    session.exec(delete(Throttle).where(col(Throttle.key) == key))
    session.commit()


def purge(session: Session, now: datetime) -> None:
    session.exec(delete(Throttle).where(col(Throttle.updated_at) < now - FORGET_AFTER))
    session.commit()
