"""Signup, prelogin, login and unlock (docs/crypto.md §7.1 to §7.3)."""

import hashlib
from dataclasses import dataclass
from datetime import datetime, timedelta

from sqlmodel import Session, col, delete, desc, select

from serenity import audit
from serenity.agent.service import SERVER_KEY_SETTING
from serenity.auth import sessions, throttle, totp
from serenity.auth.errors import AuthError, AuthErrorKind
from serenity.auth.guards import check_lock, fail
from serenity.auth.hashing import DummyHash, hash_key, verify_key
from serenity.config import Settings
from serenity.crypto import kdf
from serenity.crypto.encoding import b64url_decode
from serenity.models import Actor, AgentKey, DeviceSession, Setting, User, UserStatus

PENDING_TTL = timedelta(minutes=15)
INVALID = "Identifiants invalides."


@dataclass(frozen=True)
class SignupRequest:
    user_id: str
    username: str
    salt: bytes
    params: kdf.KdfParams
    auth_key: bytes
    recovery_auth_key: bytes
    uk_by_mk: bytes
    uk_by_rk: bytes
    ak_by_uk: bytes
    ak_sealed: bytes

    def __repr__(self) -> str:
        return f"SignupRequest(user_id={self.user_id!r})"


@dataclass(frozen=True)
class LoginResult:
    token: str
    device_session: DeviceSession
    user: User
    agent_key: AgentKey

    def __repr__(self) -> str:
        return f"LoginResult(user_id={self.user.id!r})"


def registration_open(session: Session) -> bool:
    """V1 is mono-user: signup closes once an account is active."""
    return session.exec(select(User).where(User.status == UserStatus.ACTIVE)).first() is None


def server_key_id(session: Session) -> bytes:
    row = session.get(Setting, SERVER_KEY_SETTING)
    if row is None:
        raise AuthError(
            AuthErrorKind.UNAVAILABLE, "Agent pas encore démarré, réessaie dans un instant."
        )
    return b64url_decode(row.value["key_id"])


def active_user(session: Session, username: str) -> User | None:
    return session.exec(
        select(User).where(User.username == username, User.status == UserStatus.ACTIVE)
    ).first()


def session_user(session: Session, row: DeviceSession) -> User:
    user = session.get(User, row.user_id)
    if user is None:
        raise AuthError(AuthErrorKind.NOT_FOUND, "Compte introuvable.")
    return user


def latest_agent_key(session: Session, user_id: str) -> AgentKey:
    row = session.exec(
        select(AgentKey).where(AgentKey.user_id == user_id).order_by(desc(AgentKey.version))
    ).first()
    if row is None:
        raise AuthError(AuthErrorKind.UNAVAILABLE, "Clé d'agent manquante.")
    return row


def signup(
    session: Session, settings: Settings, totp_key: bytes, req: SignupRequest, now: datetime
) -> str:
    """Create a pending account. Returns the TOTP seed, shown once to enrol the app."""
    if not registration_open(session):
        raise AuthError(AuthErrorKind.CLOSED, "Les inscriptions sont fermées.")
    # Drop abandoned signups, and any previous attempt with this username or id.
    session.exec(
        delete(User).where(
            col(User.status) == UserStatus.PENDING,
            (col(User.created_at) < now - PENDING_TTL)
            | (col(User.username) == req.username)
            | (col(User.id) == req.user_id),
        )
    )
    secret = totp.new_secret()
    user = User(
        id=req.user_id,
        username=req.username,
        kdf_salt=req.salt,
        kdf_memlimit=req.params.memlimit,
        kdf_opslimit=req.params.opslimit,
        auth_hash=hash_key(settings, req.auth_key),
        recovery_hash=hash_key(settings, req.recovery_auth_key),
        uk_by_mk=req.uk_by_mk,
        uk_by_rk=req.uk_by_rk,
        totp_secret_enc=totp.encrypt_secret(totp_key, req.user_id, secret),
        created_at=now,
        updated_at=now,
        password_changed_at=now,
    )
    session.add(user)
    session.flush()  # the agent key references the user row
    session.add(
        AgentKey(user_id=req.user_id, version=1, ak_by_uk=req.ak_by_uk, ak_sealed=req.ak_sealed)
    )
    session.commit()
    audit.record(session, Actor.USER, "auth.signup", user_id=req.user_id, outcome="pending")
    return secret


def confirm_signup(
    session: Session,
    settings: Settings,
    totp_key: bytes,
    user_id: str,
    code: str,
    device: str,
    now: datetime,
) -> LoginResult:
    key = f"signup:{user_id}"
    check_lock(session, key, now, user_id)
    user = session.get(User, user_id)
    if user is None or user.status != UserStatus.PENDING or user.created_at < now - PENDING_TTL:
        raise AuthError(AuthErrorKind.NOT_FOUND, "Inscription introuvable ou expirée, recommence.")
    if not registration_open(session):
        raise AuthError(AuthErrorKind.CLOSED, "Les inscriptions sont fermées.")
    step = totp.matching_step(
        totp.decrypt_secret(totp_key, user.id, user.totp_secret_enc), code, None
    )
    if step is None:
        fail(session, settings, key, now, user_id, "auth.signup.confirm", "Code incorrect.")
    throttle.reset(session, key)
    user.status = UserStatus.ACTIVE
    user.totp_last_step = step
    user.updated_at = now
    session.add(user)
    session.commit()
    audit.record(session, Actor.USER, "auth.signup.confirm", user_id=user.id)
    return open_session(session, settings, user, device, now)


def prelogin(settings: Settings, session: Session, username: str) -> tuple[bytes, kdf.KdfParams]:
    """Salt and Argon2id cost. Unknown usernames get a stable fake salt (no enumeration)."""
    user = active_user(session, username)
    if user is not None:
        return user.kdf_salt, kdf.KdfParams(user.kdf_memlimit, user.kdf_opslimit)
    key = hashlib.sha256(settings.secret_key.get_secret_value().encode()).digest()
    fake = hashlib.blake2b(
        username.encode(), key=key, digest_size=16, person=b"srn-prelogin"
    ).digest()
    return fake, kdf.DEFAULT_PARAMS


def login(
    session: Session,
    settings: Settings,
    totp_key: bytes,
    dummy: DummyHash,
    username: str,
    auth_key: bytes,
    code: str,
    device: str,
    now: datetime,
) -> LoginResult:
    key = f"login:{username}"
    user = active_user(session, username)
    user_id = user.id if user else None
    check_lock(session, key, now, user_id)
    if user is None:
        dummy.burn(auth_key)
        fail(session, settings, key, now, None, "auth.login", INVALID)
    password_ok = verify_key(user.auth_hash, auth_key)
    secret = totp.decrypt_secret(totp_key, user.id, user.totp_secret_enc)
    step = totp.matching_step(secret, code, user.totp_last_step)
    if not password_ok or step is None:
        fail(session, settings, key, now, user.id, "auth.login", INVALID)
    throttle.reset(session, key)
    user.totp_last_step = step
    session.add(user)
    session.commit()
    result = open_session(session, settings, user, device, now)
    audit.record(
        session,
        Actor.USER,
        "auth.login",
        user_id=user.id,
        details={"device": result.device_session.device},
    )
    return result


def unlock(
    session: Session, settings: Settings, row: DeviceSession, auth_key: bytes, now: datetime
) -> None:
    """Prove the master password again (AuthKey) to reach the unlocked level."""
    key = f"unlock:{row.user_id}"
    check_lock(session, key, now, row.user_id)
    user = session.get(User, row.user_id)
    if user is None or not verify_key(user.auth_hash, auth_key):
        fail(
            session,
            settings,
            key,
            now,
            row.user_id,
            "auth.unlock",
            "Mot de passe maître incorrect.",
        )
    throttle.reset(session, key)
    sessions.unlock(session, settings, row, now)
    audit.record(session, Actor.USER, "auth.unlock", user_id=row.user_id)


def open_session(
    session: Session, settings: Settings, user: User, device: str, now: datetime
) -> LoginResult:
    token, row = sessions.create(session, settings, user.id, device, now)
    return LoginResult(token, row, user, latest_agent_key(session, user.id))
