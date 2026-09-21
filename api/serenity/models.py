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


class Actor(StrEnum):
    USER = "user"
    AGENT = "agent"
    SYSTEM = "system"


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
    # Rotation in flight (docs/crypto.md §7.12): the next revision, encrypted with AK, held
    # aside while the active one still opens the site. Agent zone only.
    pending_block: bytes | None = None
    pending_revision: int | None = None
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


class BreachKind(StrEnum):
    PWNED_PASSWORD = "pwned_password"  # noqa: S105 (label, not a secret)
    REUSED = "reused"
    WEAK = "weak"
    OLD = "old"
    EMAIL_BREACH = "email_breach"


# Kinds a client may report for an entry (email alerts come from the agent only).
ITEM_BREACH_KINDS = (BreachKind.PWNED_PASSWORD, BreachKind.REUSED, BreachKind.WEAK, BreachKind.OLD)


class BreachStatus(StrEnum):
    OPEN = "open"
    RESOLVED = "resolved"
    # Seen by the user and set aside; reopens if the entry changes and the problem comes back.
    DISMISSED = "dismissed"


class Breach(SQLModel, table=True):
    """A watch alert. Never contains a secret: an entry id and a kind, or a watched e-mail."""

    __table_args__ = (UniqueConstraint("user_id", "subject", "kind"),)

    id: int | None = Field(default=None, primary_key=True)
    user_id: str = Field(foreign_key="user.id", index=True, ondelete="CASCADE")
    kind: BreachKind
    # Entry id for entry alerts, "<email>|<breach name>" for e-mail alerts: the dedup key.
    subject: str
    item_id: str | None = Field(default=None, foreign_key="item.id", index=True, ondelete="CASCADE")
    item_revision: int | None = None
    # "client" (scan in the browser), "agent" (server-side, agent zone) or "hibp".
    source: str
    status: BreachStatus = BreachStatus.OPEN
    details: dict[str, Any] = Field(default_factory=dict, sa_column=Column(JSON))
    first_seen_at: datetime = _ts(default_factory=utcnow)
    last_seen_at: datetime = _ts(default_factory=utcnow)
    resolved_at: datetime | None = _ts(default=None)


class ItemScan(SQLModel, table=True):
    """When an entry was last checked against Pwned Passwords, and at which revision.

    Only the network check is tracked: the local checks (reused, weak, old) cost nothing and run
    on the whole vault every time. Holds no secret, and nothing the server did not already know.
    """

    __tablename__ = "item_scan"

    item_id: str = Field(primary_key=True, foreign_key="item.id", ondelete="CASCADE")
    user_id: str = Field(foreign_key="user.id", index=True, ondelete="CASCADE")
    pwned_revision: int
    pwned_checked_at: datetime = _ts(default_factory=utcnow)


class ItemIcon(SQLModel, table=True):
    """The site icon of an agent-zone entry, fetched by the agent and stored encrypted with AK.

    The api can serve this row but cannot read it: only the clients and the agent process hold
    AK. `block` is null when the site gave nothing usable, which is remembered so the agent does
    not ask again at every pass. No domain and no name is stored here (docs/crypto.md §5.8).
    """

    __tablename__ = "item_icon"

    item_id: str = Field(primary_key=True, foreign_key="item.id", ondelete="CASCADE")
    user_id: str = Field(foreign_key="user.id", index=True, ondelete="CASCADE")
    # Moves on every successful fetch: it is part of the encryption context.
    version: int = 1
    # image/png, image/jpeg, image/webp or image/x-icon. Null when there is no block.
    mime: str | None = None
    block: bytes | None = None
    # Set on every attempt, successful or not: the refresh schedule reads this one.
    attempted_at: datetime = _ts(default_factory=utcnow)


class Notification(SQLModel, table=True):
    """In-app notification (ADR-005). No text: the client renders it, so no entry name is stored."""

    id: int | None = Field(default=None, primary_key=True)
    user_id: str = Field(foreign_key="user.id", index=True, ondelete="CASCADE")
    kind: str
    breach_id: int | None = Field(default=None, foreign_key="breach.id", ondelete="CASCADE")
    item_id: str | None = None
    created_at: datetime = _ts(default_factory=utcnow, index=True)
    read_at: datetime | None = _ts(default=None)


class WatchedEmail(SQLModel, table=True):
    """Address checked against HIBP breaches (only when HIBP_API_KEY is set)."""

    __tablename__ = "watched_email"
    __table_args__ = (UniqueConstraint("user_id", "email"),)

    id: int | None = Field(default=None, primary_key=True)
    user_id: str = Field(foreign_key="user.id", index=True, ondelete="CASCADE")
    email: str
    added_at: datetime = _ts(default_factory=utcnow)
    last_checked_at: datetime | None = _ts(default=None)


class PolicyMode(StrEnum):
    # The agent rotates on its own when due (agent zone, allowlisted site, V3 executor).
    AUTONOMOUS = "autonomous"
    # The agent asks first: Approve / Refuse in a notification.
    APPROVAL = "approval"


# Allowed rotation frequencies, in days (None = never).
POLICY_FREQUENCIES = (7, 30, 90, 180)


class RotationPolicy(SQLModel, table=True):
    """How often an entry should change. Agent zone: rotation; personal zone: reminder only."""

    __tablename__ = "rotation_policy"

    item_id: str = Field(primary_key=True, foreign_key="item.id", ondelete="CASCADE")
    user_id: str = Field(foreign_key="user.id", index=True, ondelete="CASCADE")
    frequency_days: int | None = None
    mode: PolicyMode = PolicyMode.APPROVAL
    # Date of the last password change, sent by the client (a date, never the password).
    changed_at: datetime | None = _ts(default=None)
    next_due_at: datetime | None = _ts(default=None, index=True)
    last_reminded_at: datetime | None = _ts(default=None)
    updated_at: datetime = _ts(default_factory=utcnow)


class RotationStatus(StrEnum):
    SCHEDULED = "scheduled"  # due: waits for a decision (approval) or the executor (autonomous)
    APPROVED = "approved"  # the user said yes; the executor (V3) will run it
    REFUSED = "refused"
    IN_PROGRESS = "in_progress"
    SUCCEEDED = "succeeded"
    FAILED = "failed"
    ROLLED_BACK = "rolled_back"
    CANCELLED = "cancelled"


OPEN_ROTATION_STATUSES = (
    RotationStatus.SCHEDULED,
    RotationStatus.APPROVED,
    RotationStatus.IN_PROGRESS,
)


class Rotation(SQLModel, table=True):
    """A password rotation of an agent-zone entry and its transactional state."""

    id: int | None = Field(default=None, primary_key=True)
    user_id: str = Field(foreign_key="user.id", index=True, ondelete="CASCADE")
    item_id: str = Field(foreign_key="item.id", index=True, ondelete="CASCADE")
    status: RotationStatus = RotationStatus.SCHEDULED
    # "schedule" (policy due date), "breach" (password exposed) or "manual".
    trigger: str
    mode: PolicyMode
    requested_at: datetime = _ts(default_factory=utcnow)
    decided_at: datetime | None = _ts(default=None)
    started_at: datetime | None = _ts(default=None)
    finished_at: datetime | None = _ts(default=None)
    # Sanitized reason of a failure (never a secret).
    error: str | None = None


class Throttle(SQLModel, table=True):
    """Failed attempts per key (login:<username>, unlock:<user>...), progressive lockout."""

    key: str = Field(primary_key=True)
    failures: int = 0
    lockouts: int = 0
    locked_until: datetime | None = _ts(default=None)
    updated_at: datetime = _ts(default_factory=utcnow)
