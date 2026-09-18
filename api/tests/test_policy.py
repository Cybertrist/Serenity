from datetime import UTC, datetime, timedelta

import pytest

from serenity.policy import is_rotation_due, next_rotation_at

NOW = datetime(2026, 9, 18, 12, 0, tzinfo=UTC)


def test_no_interval_means_never() -> None:
    assert next_rotation_at(NOW - timedelta(days=999), None, NOW) is None


def test_unknown_last_change_is_due_now() -> None:
    assert next_rotation_at(None, 90, NOW) == NOW


def test_last_change_plus_interval() -> None:
    changed = datetime(2026, 1, 1, tzinfo=UTC)
    assert next_rotation_at(changed, 90, NOW) == datetime(2026, 4, 1, tzinfo=UTC)


def test_invalid_interval_is_refused() -> None:
    with pytest.raises(ValueError):
        next_rotation_at(NOW, 0, NOW)


def test_naive_datetime_is_refused() -> None:
    with pytest.raises(ValueError):
        next_rotation_at(datetime(2026, 1, 1), 30, NOW)


def test_is_rotation_due() -> None:
    assert is_rotation_due(NOW, NOW)
    assert is_rotation_due(NOW - timedelta(seconds=1), NOW)
    assert not is_rotation_due(NOW + timedelta(seconds=1), NOW)
    assert not is_rotation_due(None, NOW)
