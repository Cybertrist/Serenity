"""Agent rules checked by code: rotation due dates (kill switch and allowlist in phase 6)."""

from datetime import datetime, timedelta


def next_rotation_at(
    password_changed_at: datetime | None,
    interval_days: int | None,
    now: datetime,
) -> datetime | None:
    """Date at which a password should be rotated.

    - no interval: never rotated automatically (None);
    - unknown last change: due now, the password age cannot be trusted;
    - otherwise: last change + interval.
    """
    if interval_days is None:
        return None
    if interval_days < 1:
        raise ValueError("interval_days must be >= 1")
    if password_changed_at is None:
        return now
    if password_changed_at.tzinfo is None:
        raise ValueError("password_changed_at must be timezone-aware")
    return password_changed_at + timedelta(days=interval_days)


def is_rotation_due(next_at: datetime | None, now: datetime) -> bool:
    return next_at is not None and next_at <= now
