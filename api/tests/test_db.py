from datetime import UTC, datetime

import pytest
from sqlalchemy import Engine, text
from sqlalchemy.exc import StatementError
from sqlmodel import Session

from serenity.db import MIGRATIONS, SCHEMA_VERSION_KEY, Migration, init_db
from serenity.models import Setting, Throttle


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


def test_v2_upgrades_a_v1_database(engine: Engine) -> None:
    with Session(engine) as session:
        for sql in (
            "DROP INDEX ix_auditlog_user_id",
            "ALTER TABLE auditlog DROP COLUMN user_id",
            "CREATE TABLE auth_session (id INTEGER PRIMARY KEY)",
        ):
            session.connection().execute(text(sql))
        MIGRATIONS[1](session)
        MIGRATIONS[1](session)  # idempotent
        session.commit()
    assert "auth_session" not in _names(engine, "table")
    assert "ix_auditlog_user_id" in _names(engine, "index")


def _names(engine: Engine, kind: str) -> set[str]:
    with Session(engine) as session:
        rows = session.connection().execute(
            text("SELECT name FROM sqlite_master WHERE type = :kind"), {"kind": kind}
        )
        return {str(row[0]) for row in rows}


def test_datetimes_come_back_timezone_aware(db: Session) -> None:
    changed = datetime(2026, 1, 1, 8, 30, tzinfo=UTC)
    db.add(Throttle(key="k", locked_until=changed))
    db.commit()
    db.expunge_all()
    row = db.get(Throttle, "k")
    assert row is not None
    assert row.locked_until == changed
    assert row.locked_until.tzinfo is not None


def test_naive_datetimes_are_refused(db: Session) -> None:
    db.add(Throttle(key="k", locked_until=datetime(2026, 1, 1)))
    with pytest.raises(StatementError):
        db.commit()


def test_v4_replaces_the_legacy_breach_table(engine: Engine) -> None:
    with Session(engine) as session:
        conn = session.connection()
        conn.execute(text("DROP TABLE breach"))
        conn.execute(text("CREATE TABLE breach (id INTEGER PRIMARY KEY, entry_id INTEGER)"))
        conn.execute(text("CREATE TABLE entry (id INTEGER PRIMARY KEY)"))
        MIGRATIONS[3](session)
        MIGRATIONS[3](session)  # idempotent
        session.commit()
    assert "entry" not in _names(engine, "table")
    with Session(engine) as session:
        columns = {r[1] for r in session.connection().execute(text('PRAGMA table_info("breach")'))}
    assert {"subject", "kind", "item_id"} <= columns
