from datetime import UTC, datetime, timedelta

from sqlmodel import Session

from serenity.auth import throttle
from serenity.config import Settings

NOW = datetime(2026, 9, 18, 12, 0, tzinfo=UTC)


def test_progressive_lockout(db: Session, settings: Settings) -> None:
    # max 3 attempts in tests, base 1 minute: 1, 2, 4 minutes...
    durations = []
    now = NOW
    for _ in range(3):
        until = None
        for _ in range(3):
            until = throttle.register_failure(db, settings, "login:x", now)
        assert until is not None
        durations.append(until - now)
        assert throttle.locked_until(db, "login:x", now) == until
        now = until + timedelta(seconds=1)
        assert throttle.locked_until(db, "login:x", now) is None
    assert durations == [timedelta(minutes=1), timedelta(minutes=2), timedelta(minutes=4)]


def test_lockout_is_capped_at_24_hours(db: Session, settings: Settings) -> None:
    now, until = NOW, None
    for _ in range(3 * 15):
        until = throttle.register_failure(db, settings, "login:y", now) or until
        now += timedelta(minutes=1)
    assert until is not None
    assert until - (now - timedelta(minutes=1)) <= timedelta(hours=24)


def test_history_is_forgotten_after_a_quiet_day(db: Session, settings: Settings) -> None:
    for _ in range(3):
        throttle.register_failure(db, settings, "login:z", NOW)
    later = NOW + timedelta(hours=25)
    assert throttle.register_failure(db, settings, "login:z", later) is None
    throttle.register_failure(db, settings, "login:z", later)
    until = throttle.register_failure(db, settings, "login:z", later)
    assert until == later + timedelta(minutes=1)  # back to the first level


def test_success_resets(db: Session, settings: Settings) -> None:
    throttle.register_failure(db, settings, "login:w", NOW)
    throttle.reset(db, "login:w")
    assert throttle.locked_until(db, "login:w", NOW) is None
