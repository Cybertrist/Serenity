"""SQLModel models.

No secret in clear: key material is stored only as encrypted blocks (docs/crypto.md §6),
authentication keys only as Argon2id hashes, TOTP seeds encrypted with the TOTP key file.
"""

from datetime import UTC, datetime
from enum import StrEnum
from typing import Any

from sqlalchemy import JSON, Column, DateTime, TypeDecorator, UniqueConstraint
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
    """A vault item watched by Serenity (metadata only; replaced by `Item` in phase 4)."""

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
    user_id: str | None = Field(default=None, index=True)
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


class UserStatus(StrEnum):
    # Created, waiting for the first TOTP code.
    PENDING = "pending"
    ACTIVE = "active"


class User(SQLModel, table=True):
    """An account. Mono-user in V1, multi-user by design (docs/crypto.md §6)."""

    # UUID v4 chosen by the client: it is part of every encryption context.
    id: str = Field(primary_key=True)
    username: str = Field(index=True)
    status: UserStatus = UserStatus.PENDING
    kdf_salt: bytes
    kdf_memlimit: int
    kdf_opslimit: int
    # crypto_pwhash_str of AuthKey and of the recovery auth key (RAK).
    auth_hash: str
    recovery_hash: str
    # AEAD blocks: UK wrapped by MEK, and by the recovery wrapping key (RWK).
    uk_by_mk: bytes
    uk_by_rk: bytes
    # Login TOTP seed, AEAD block under the TOTP key file (context serenity/v1/totp/<user>).
    totp_secret_enc: bytes
    totp_last_step: int | None = None
    # Short-lived ticket between the two recovery steps (HMAC of the token).
    recovery_ticket_hash: str | None = None
    recovery_ticket_expires_at: datetime | None = _ts(default=None)
    # Last change sequence number of the vault: clients sync with `since=<seq>`.
    vault_seq: int = 0
    created_at: datetime = _ts(default_factory=utcnow)
    updated_at: datetime = _ts(default_factory=utcnow)
    password_changed_at: datetime = _ts(default_factory=utcnow)


class AgentKey(SQLModel, table=True):
    """One version of the agent key AK, stored twice (docs/crypto.md §3)."""

    __tablename__ = "agent_key"
    __table_args__ = (UniqueConstraint("user_id", "version"),)

    id: int | None = Field(default=None, primary_key=True)
    user_id: str = Field(foreign_key="user.id", index=True, ondelete="CASCADE")
    version: int
    # For clients: AK wrapped by UK. For the agent: AK sealed for the server key.
    ak_by_uk: bytes
    ak_sealed: bytes
    created_at: datetime = _ts(default_factory=utcnow)


class Zone(StrEnum):
    PERSONAL = "personal"
    AGENT = "agent"


class Item(SQLModel, table=True):
    """A vault entry: one encrypted block (docs/crypto.md §5.7). The server cannot read it,
    except the agent process for the agent zone."""

    # UUID v4 chosen by the client: it is part of the encryption context.
    id: str = Field(primary_key=True)
    user_id: str = Field(foreign_key="user.id", index=True, ondelete="CASCADE")
    zone: Zone = Zone.PERSONAL
    revision: int = 1
    # None once purged from the trash (the row stays as a tombstone for sync).
    block: bytes | None
    # Change sequence number (per user): set on every create, update, delete, restore, purge.
    seq: int = Field(index=True)
    created_at: datetime = _ts(default_factory=utcnow)
    updated_at: datetime = _ts(default_factory=utcnow)
    deleted_at: datetime | None = _ts(default=None)
    purged_at: datetime | None = _ts(default=None)


class ItemRevision(SQLModel, table=True):
    """Previous encrypted versions of an item (the 10 most recent)."""

    __tablename__ = "item_revision"

    id: int | None = Field(default=None, primary_key=True)
    item_id: str = Field(foreign_key="item.id", index=True, ondelete="CASCADE")
    revision: int
    zone: Zone
    block: bytes
    created_at: datetime = _ts(default_factory=utcnow)


class DeviceSession(SQLModel, table=True):
    """A logged-in device. Full login every 60 days; unlocked 15 min after the master password."""

    __tablename__ = "device_session"

    id: int | None = Field(default=None, primary_key=True)
    user_id: str = Field(foreign_key="user.id", index=True, ondelete="CASCADE")
    # HMAC-SHA256 of the cookie token: the database alone cannot be replayed as a cookie.
    token_hash: str = Field(unique=True, index=True)
    device: str = ""
    created_at: datetime = _ts(default_factory=utcnow)
    expires_at: datetime = _ts(index=True)
    last_seen_at: datetime = _ts(default_factory=utcnow)
    unlocked_until: datetime | None = _ts(default=None)


class Throttle(SQLModel, table=True):
    """Failed attempts per key (login:<username>, unlock:<user>...), progressive lockout."""

    key: str = Field(primary_key=True)
    failures: int = 0
    lockouts: int = 0
    locked_until: datetime | None = _ts(default=None)
    updated_at: datetime = _ts(default_factory=utcnow)
