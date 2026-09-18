from datetime import UTC, datetime

import pytest
from sqlalchemy import Engine
from sqlalchemy.exc import StatementError
from sqlmodel import Session

from serenity.db import SCHEMA_VERSION_KEY, Migration, init_db
from serenity.models import Entry, Setting


def test_init_db_is_idempotent(engine: Engine) -> None:
    assert init_db(engine) == init_db(engine)


def test_pending_migrations_run_once(engine: Engine) -> None:
    calls: list[int] = []
    migrations: list[Migration] = [lambda s: None, lambda s: calls.append(2)]
    assert init_db(engine, migrations) == 2
    assert init_db(engine, migrations) == 2
    assert calls == [2]
    with Session(engine) as session:
        row = session.get(Setting, SCHEMA_VERSION_KEY)
        assert row is not None
        assert row.value == 2


def test_newer_schema_is_refused(engine: Engine) -> None:
    init_db(engine, [lambda s: None, lambda s: None])
    with pytest.raises(RuntimeError):
        init_db(engine, [lambda s: None])


def test_datetimes_come_back_timezone_aware(db: Session) -> None:
    changed = datetime(2026, 1, 1, 8, 30, tzinfo=UTC)
    db.add(Entry(vault_item_id="abc", name="Example", password_changed_at=changed))
    db.commit()
    db.expunge_all()
    entry = db.get(Entry, 1)
    assert entry is not None
    assert entry.password_changed_at == changed
    assert entry.password_changed_at.tzinfo is not None


def test_naive_datetimes_are_refused(db: Session) -> None:
    db.add(Entry(vault_item_id="abc", name="Example", password_changed_at=datetime(2026, 1, 1)))
    with pytest.raises(StatementError):
        db.commit()
