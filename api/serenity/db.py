"""SQLite engine, sessions and startup migrations."""

import logging
from collections.abc import Callable
from pathlib import Path
from typing import Any

from sqlalchemy import Engine, event, text
from sqlmodel import Session, SQLModel, create_engine

# Importing the models module registers every table on SQLModel.metadata.
from serenity.models import Setting, utcnow

logger = logging.getLogger(__name__)

SCHEMA_VERSION_KEY = "schema_version"

Migration = Callable[[Session], None]


def add_column(session: Session, table: str, column: str, ddl: str) -> None:
    """Add a column unless it exists: a fresh database already has it from `create_all`."""
    columns = {row[1] for row in session.connection().execute(text(f"PRAGMA table_info({table})"))}
    if column not in columns:
        session.connection().execute(text(f"ALTER TABLE {table} ADD COLUMN {column} {ddl}"))


# Ordered, append-only list. Version N is MIGRATIONS[N - 1].
# Version 1 is the baseline created by `SQLModel.metadata.create_all`.
# Add a function here for every change that `create_all` cannot do (new column, data fix...).
# Migrations must be idempotent: on a fresh database, `create_all` already built the latest schema.
MIGRATIONS: list[Migration] = [
    lambda session: None,
    lambda session: add_column(session, "entry", "removed_at", "DATETIME"),
]


def create_db_engine(db_path: Path) -> Engine:
    engine = create_engine(f"sqlite:///{db_path}", connect_args={"check_same_thread": False})
    event.listen(engine, "connect", _set_sqlite_pragmas)
    return engine


def _set_sqlite_pragmas(dbapi_connection: Any, _record: Any) -> None:
    cursor = dbapi_connection.cursor()
    cursor.execute("PRAGMA foreign_keys=ON")
    cursor.execute("PRAGMA journal_mode=WAL")
    cursor.close()


def init_db(engine: Engine, migrations: list[Migration] | None = None) -> int:
    """Create missing tables, then apply pending migrations. Returns the schema version."""
    migrations = MIGRATIONS if migrations is None else migrations
    SQLModel.metadata.create_all(engine)
    with Session(engine) as session:
        row = session.get(Setting, SCHEMA_VERSION_KEY)
        current = int(row.value) if row else 0
        if current > len(migrations):
            raise RuntimeError(
                f"database schema v{current} is newer than this code (v{len(migrations)})"
            )
        for version in range(current + 1, len(migrations) + 1):
            logger.info("applying database migration v%d", version)
            migrations[version - 1](session)
            row = row or Setting(key=SCHEMA_VERSION_KEY)
            row.value = version
            row.updated_at = utcnow()
            session.add(row)
            session.commit()
        return len(migrations)
