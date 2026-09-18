"""Master password change and recovery with the kit (docs/crypto.md §7.7, §7.8)."""

import secrets
from dataclasses import dataclass
from datetime import datetime, timedelta

from sqlmodel import Session, select

from serenity import audit
from serenity.auth import sessions, throttle, totp
from serenity.auth.accounts import LoginResult, active_user, latest_agent_key, open_session
from serenity.auth.errors import AuthError, AuthErrorKind
from serenity.auth.guards import check_lock, fail
from serenity.auth.hashing import DummyHash, hash_key, verify_key
from serenity.config import Settings
from serenity.crypto import kdf
from serenity.models import Actor, AgentKey, DeviceSession, User

TICKET_TTL = timedelta(minutes=10)


@dataclass(frozen=True)
class NewMasterPassword:
    salt: bytes
    params: kdf.KdfParams
    auth_key: bytes
    uk_by_mk: bytes

    def __repr__(self) -> str:
        return "NewMasterPassword(<hidden>)"


@dataclass(frozen=True)
class RecoveryStart:
    user: User
    ticket: str
    agent_key: AgentKey

    def __repr__(self) -> str:
        return f"RecoveryStart(user_id={self.user.id!r})"


def change_password(
    session: Session,
    settings: Settings,
    totp_key: bytes,
    row: DeviceSession,
    current_auth_key: bytes,
    code: str,
    new: NewMasterPassword,
    now: datetime,
) -> int:
    """Replace salt, AuthKey and UK wrapping. Entries are untouched. Returns revoked sessions."""
    key = f"password:{row.user_id}"
    check_lock(session, key, now, row.user_id)
    user = session.get(User, row.user_id)
    if user is None:
        raise AuthError(AuthErrorKind.NOT_FOUND, "Compte introuvable.")
    ok = verify_key(user.auth_hash, current_auth_key)
    step = totp.matching_step(
        totp.decrypt_secret(totp_key, user.id, user.totp_secret_enc), code, user.totp_last_step
    )
    if not ok or step is None:
        fail(
            session,
            settings,
            key,
            now,
            user.id,
            "auth.password.change",
            "Mot de passe ou code incorrect.",
        )
    throttle.reset(session, key)
    _apply_new_password(settings, user, new, now)
    user.totp_last_step = step
    session.add(user)
    session.commit()
    revoked = sessions.revoke_all(session, user.id, keep=row.id)
    audit.record(
        session,
        Actor.USER,
        "auth.password.change",
        user_id=user.id,
        details={"revoked_sessions": revoked},
    )
    return revoked


def start_recovery(
    session: Session,
    settings: Settings,
    totp_key: bytes,
    dummy: DummyHash,
    username: str,
    recovery_auth_key: bytes,
    code: str,
    now: datetime,
) -> RecoveryStart:
    key = f"recover:{username}"
    user = active_user(session, username)
    check_lock(session, key, now, user.id if user else None)
    if user is None:
        dummy.burn(recovery_auth_key)
        fail(
            session,
            settings,
            key,
            now,
            None,
            "auth.recover.start",
            "Clé de récupération ou code incorrect.",
        )
    ok = verify_key(user.recovery_hash, recovery_auth_key)
    step = totp.matching_step(
        totp.decrypt_secret(totp_key, user.id, user.totp_secret_enc), code, user.totp_last_step
    )
    if not ok or step is None:
        fail(
            session,
            settings,
            key,
            now,
            user.id,
            "auth.recover.start",
            "Clé de récupération ou code incorrect.",
        )
    throttle.reset(session, key)
    ticket = secrets.token_urlsafe(32)
    user.recovery_ticket_hash = sessions.token_hash(settings, ticket)
    user.recovery_ticket_expires_at = now + TICKET_TTL
    user.totp_last_step = step
    session.add(user)
    session.commit()
    audit.record(session, Actor.USER, "auth.recover.start", user_id=user.id)
    return RecoveryStart(user, ticket, latest_agent_key(session, user.id))


def complete_recovery(
    session: Session,
    settings: Settings,
    ticket: str,
    new: NewMasterPassword,
    new_recovery_auth_key: bytes,
    new_uk_by_rk: bytes,
    device: str,
    now: datetime,
) -> LoginResult:
    """New master password and new kit. Every existing session is revoked."""
    user = session.exec(
        select(User).where(User.recovery_ticket_hash == sessions.token_hash(settings, ticket))
    ).first()
    if (
        user is None
        or user.recovery_ticket_expires_at is None
        or user.recovery_ticket_expires_at <= now
    ):
        raise AuthError(AuthErrorKind.NOT_FOUND, "Récupération expirée, recommence.")
    _apply_new_password(settings, user, new, now)
    user.recovery_hash = hash_key(settings, new_recovery_auth_key)
    user.uk_by_rk = new_uk_by_rk
    user.recovery_ticket_hash = None
    user.recovery_ticket_expires_at = None
    session.add(user)
    session.commit()
    revoked = sessions.revoke_all(session, user.id)
    audit.record(
        session,
        Actor.USER,
        "auth.recover.complete",
        user_id=user.id,
        details={"revoked_sessions": revoked},
    )
    return open_session(session, settings, user, device, now)


def _apply_new_password(
    settings: Settings, user: User, new: NewMasterPassword, now: datetime
) -> None:
    user.kdf_salt = new.salt
    user.kdf_memlimit = new.params.memlimit
    user.kdf_opslimit = new.params.opslimit
    user.auth_hash = hash_key(settings, new.auth_key)
    user.uk_by_mk = new.uk_by_mk
    user.password_changed_at = now
    user.updated_at = now
