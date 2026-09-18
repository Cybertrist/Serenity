from datetime import UTC, datetime

import pytest
from sqlalchemy import Engine, text
from sqlalchemy.exc import StatementError
from sqlmodel import Session

from serenity.db import MIGRATIONS, SCHEMA_VERSION_KEY, Migration, add_column, init_db
from serenity.models import Entry, Setting


def test_init_db_is_idempotent(engine: Engine) -> None:
    assert init_db(engine) == init_db(engine)


def test_pending_migrations_run_once(engine: Engine) -> None:
    calls: list[int] = []
    migrations: list[Migration] = [*MIGRATIONS, lambda s: calls.append(1)]
    expected = len(migrations)
    assert init_db(engine, migrations) == expected
    assert init_db(engine, migrations) == expected
    assert calls == [1]
    with Session(engine) as session:
        row = session.get(Setting, SCHEMA_VERSION_KEY)
        assert row is not None
        assert row.value == expected


def test_newer_schema_is_refused(engine: Engine) -> None:
    with pytest.raises(RuntimeError):
        init_db(engine, MIGRATIONS[:-1])


def test_add_column_migration_upgrades_an_old_database(engine: Engine) -> None:
    with Session(engine) as session:
        session.connection().execute(text("ALTER TABLE entry DROP COLUMN removed_at"))
        session.commit()
        add_column(session, "entry", "removed_at", "DATETIME")
        add_column(session, "entry", "removed_at", "DATETIME")  # idempotent
        session.commit()
        columns = {r[1] for r in session.connection().execute(text("PRAGMA table_info(entry)"))}
    assert "removed_at" in columns


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
