"""Login throttling: lockout after too many failed attempts, persisted in SQLite."""

from datetime import datetime, timedelta

from sqlmodel import Session

from serenity.models import Setting

THROTTLE_KEY = "login_throttle"


def _state(session: Session) -> Setting:
    return session.get(Setting, THROTTLE_KEY) or Setting(
        key=THROTTLE_KEY, value={"failures": 0, "locked_until": None}
    )


def locked_until(session: Session, now: datetime) -> datetime | None:
    """Return the end of the current lockout, or None if logins are allowed."""
    raw = _state(session).value.get("locked_until")
    if raw is None:
        return None
    until = datetime.fromisoformat(raw)
    return until if until > now else None


def register_failure(
    session: Session, now: datetime, max_attempts: int, lockout: timedelta
) -> datetime | None:
    """Count a failed attempt. Returns the lockout end if this failure triggered one."""
    row = _state(session)
    # Failures older than one lockout window are forgotten.
    previous = int(row.value.get("failures", 0)) if row.updated_at > now - lockout else 0
    failures = previous + 1
    until: datetime | None = None
    if failures >= max_attempts:
        until = now + lockout
        failures = 0
    row.value = {"failures": failures, "locked_until": until.isoformat() if until else None}
    row.updated_at = now
    session.add(row)
    session.commit()
    return until


def reset(session: Session, now: datetime) -> None:
    row = _state(session)
    row.value = {"failures": 0, "locked_until": None}
    row.updated_at = now
    session.add(row)
    session.commit()
