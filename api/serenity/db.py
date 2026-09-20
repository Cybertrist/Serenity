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
    rows = session.connection().execute(text(f'PRAGMA table_info("{table}")'))
    if column not in {row[1] for row in rows}:
        session.connection().execute(text(f'ALTER TABLE "{table}" ADD COLUMN "{column}" {ddl}'))


def _v2_accounts(session: Session) -> None:
    # Accounts replace the single-user password file; old sessions are meaningless.
    session.connection().execute(text("DROP TABLE IF EXISTS auth_session"))
    session.connection().execute(
        text("DELETE FROM setting WHERE key IN ('login_throttle', 'totp_last_step')")
    )
    add_column(session, "auditlog", "user_id", "VARCHAR")
    session.connection().execute(
        text("CREATE INDEX IF NOT EXISTS ix_auditlog_user_id ON auditlog (user_id)")
    )


# Ordered, append-only list. Version N is MIGRATIONS[N - 1].
# Version 1 is the baseline created by `SQLModel.metadata.create_all`.
# Add a function here for every change that `create_all` cannot do (new column, data fix...).
# Migrations must be idempotent: on a fresh database, `create_all` already built the latest schema.
def _v3_vault(session: Session) -> None:
    # item and item_revision are new tables, created by create_all.
    add_column(session, "user", "vault_seq", "INTEGER NOT NULL DEFAULT 0")


def _v4_watch(session: Session) -> None:
    # Legacy tables from the Vaultwarden era (always empty): entry, rotation and the old breach.
    conn = session.connection()

    def legacy(table: str) -> bool:
        return "entry_id" in {r[1] for r in conn.execute(text(f'PRAGMA table_info("{table}")'))}

    old_breach = legacy("breach")
    # Only the legacy rotation table (it had entry_id): the new one must survive.
    if legacy("rotation"):
        conn.execute(text("DROP TABLE rotation"))
    if old_breach:
        conn.execute(text("DROP TABLE breach"))
        SQLModel.metadata.tables["breach"].create(conn)
    conn.execute(text("DROP TABLE IF EXISTS entry"))


def _v6_pending_rotation(session: Session) -> None:
    # The block a rotation holds aside before it touches the site (docs/crypto.md §7.12).
    add_column(session, "item", "pending_block", "BLOB")
    add_column(session, "item", "pending_revision", "INTEGER")


MIGRATIONS: list[Migration] = [
    lambda session: None,
    _v2_accounts,
    _v3_vault,
    _v4_watch,
    # rotation_policy and rotation are new tables, created by create_all.
    lambda session: None,
    _v6_pending_rotation,
]


def create_db_engine(db_path: Path) -> Engine:
    engine = create_engine(f"sqlite:///{db_path}", connect_args={"check_same_thread": False})
    event.listen(engine, "connect", _set_sqlite_pragmas)
    return engine


def _set_sqlite_pragmas(dbapi_connection: Any, _record: Any) -> None:
    cursor = dbapi_connection.cursor()
    cursor.execute("PRAGMA foreign_keys=ON")
    cursor.execute("PRAGMA journal_mode=WAL")
    # The api and the agent share the database: wait for a lock instead of failing.
    cursor.execute("PRAGMA busy_timeout=5000")
    cursor.close()


def schema_version(engine: Engine) -> int:
    with Session(engine) as session:
        row = session.get(Setting, SCHEMA_VERSION_KEY)
        return int(row.value) if row else 0


def check_schema(engine: Engine, migrations: list[Migration] | None = None) -> int:
    """For processes that must not migrate (the agent): the api owns migrations."""
    expected = len(MIGRATIONS if migrations is None else migrations)
    current = schema_version(engine)
    if current != expected:
        raise RuntimeError(f"database schema v{current}, expected v{expected}: start the api first")
    return current


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
