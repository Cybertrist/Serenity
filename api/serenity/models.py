"""SQLModel metadata models: Entry, Breach, Rotation, AuditLog, Setting, AuthSession.

Metadata only: no password, hash of a password or TOTP seed is ever stored here.
"""

from datetime import UTC, datetime
from enum import StrEnum
from typing import Any

from sqlalchemy import JSON, Column, DateTime, TypeDecorator
from sqlalchemy.engine import Dialect
from sqlmodel import Field, SQLModel


def utcnow() -> datetime:
    return datetime.now(UTC)


class UTCDateTime(TypeDecorator[datetime]):
    """Stores naive UTC in SQLite and always returns timezone-aware UTC datetimes."""

    impl = DateTime
    cache_ok = True

    def process_bind_param(self, value: datetime | None, dialect: Dialect) -> datetime | None:
        if value is None:
            return None
        if value.tzinfo is None:
            raise ValueError("naive datetime refused: use timezone-aware UTC datetimes")
        return value.astimezone(UTC).replace(tzinfo=None)

    def process_result_value(self, value: datetime | None, dialect: Dialect) -> datetime | None:
        return None if value is None else value.replace(tzinfo=UTC)


def _ts(**kwargs: Any) -> Any:
    """Timezone-aware datetime field."""
    return Field(sa_type=UTCDateTime, **kwargs)


class Criticality(StrEnum):
    # The agent always asks for approval before touching a critical account.
    CRITICAL = "critical"
    SECONDARY = "secondary"


class BreachKind(StrEnum):
    PWNED_PASSWORD = "pwned_password"  # noqa: S105 (enum label, not a secret)
    ACCOUNT_BREACH = "account_breach"
    REUSED = "reused"
    WEAK = "weak"
    OLD = "old"


class RotationStatus(StrEnum):
    PENDING_APPROVAL = "pending_approval"
    SCHEDULED = "scheduled"
    IN_PROGRESS = "in_progress"
    SUCCEEDED = "succeeded"
    FAILED = "failed"
    ROLLED_BACK = "rolled_back"
    CANCELLED = "cancelled"


class Actor(StrEnum):
    USER = "user"
    AGENT = "agent"
    SYSTEM = "system"


class Entry(SQLModel, table=True):
    """A vault item watched by Serenity (metadata mirror, synced from Vaultwarden)."""

    id: int | None = Field(default=None, primary_key=True)
    vault_item_id: str = Field(unique=True, index=True)
    name: str
    domain: str | None = Field(default=None, index=True)
    criticality: Criticality = Criticality.SECONDARY
    # None means "never rotate automatically".
    rotation_interval_days: int | None = Field(default=None, ge=1)
    password_changed_at: datetime | None = _ts(default=None)
    next_rotation_at: datetime | None = _ts(default=None, index=True)
    last_synced_at: datetime | None = _ts(default=None)
    created_at: datetime = _ts(default_factory=utcnow)
    updated_at: datetime = _ts(default_factory=utcnow)


class Breach(SQLModel, table=True):
    """A finding about an entry: leaked, reused, weak or old password."""

    id: int | None = Field(default=None, primary_key=True)
    entry_id: int = Field(foreign_key="entry.id", index=True, ondelete="CASCADE")
    kind: BreachKind
    source: str | None = None
    # Number of times seen in a breach corpus (Pwned Passwords), when relevant.
    occurrences: int | None = None
    detected_at: datetime = _ts(default_factory=utcnow)
    resolved_at: datetime | None = _ts(default=None)


class Rotation(SQLModel, table=True):
    """A password rotation attempt and its transactional state."""

    id: int | None = Field(default=None, primary_key=True)
    entry_id: int = Field(foreign_key="entry.id", index=True, ondelete="CASCADE")
    status: RotationStatus = RotationStatus.SCHEDULED
    trigger: str
    requested_at: datetime = _ts(default_factory=utcnow)
    started_at: datetime | None = _ts(default=None)
    finished_at: datetime | None = _ts(default=None)
    # Sanitized error message (never contains a secret).
    error: str | None = None


class AuditLog(SQLModel, table=True):
    """Append-only journal of every action taken by the agent, the user or the system."""

    id: int | None = Field(default=None, primary_key=True)
    created_at: datetime = _ts(default_factory=utcnow, index=True)
    actor: Actor
    action: str = Field(index=True)
    outcome: str = "success"
    target_type: str | None = None
    target_id: str | None = None
    details: dict[str, Any] = Field(default_factory=dict, sa_column=Column(JSON))


class Setting(SQLModel, table=True):
    """Key/value store for runtime state (kill switch, schema version, login throttle...)."""

    key: str = Field(primary_key=True)
    value: Any = Field(default=None, sa_column=Column(JSON))
    updated_at: datetime = _ts(default_factory=utcnow)


class AuthSession(SQLModel, table=True):
    """A logged-in browser session. Only an HMAC of the cookie token is stored."""

    __tablename__ = "auth_session"

    id: int | None = Field(default=None, primary_key=True)
    token_hash: str = Field(unique=True, index=True)
    created_at: datetime = _ts(default_factory=utcnow)
    expires_at: datetime = _ts(index=True)
