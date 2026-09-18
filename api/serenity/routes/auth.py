"""Authentication routes (docs/crypto.md §7). Only AuthKey / RAK and encrypted blocks come in."""

from datetime import datetime
from math import ceil
from typing import Annotated, NoReturn

from fastapi import APIRouter, Header, HTTPException, Response, status
from pydantic import BaseModel, Field

from serenity import audit
from serenity.auth import accounts, credentials, sessions, totp
from serenity.auth import validation as v
from serenity.auth.errors import AuthError, AuthErrorKind
from serenity.config import Settings
from serenity.crypto.encoding import b64url_encode
from serenity.deps import DbDep, DummyDep, SessionDep, SettingsDep, TotpKeyDep, UnlockedDep
from serenity.models import Actor, DeviceSession, utcnow

router = APIRouter(prefix="/api/auth", tags=["auth"])

B64 = Field(min_length=1, max_length=4096)
Code = Field(min_length=6, max_length=6, pattern=r"^\d{6}$")
UserAgent = Annotated[str, Header(alias="user-agent")]

_STATUS = {
    AuthErrorKind.INVALID: status.HTTP_401_UNAUTHORIZED,
    AuthErrorKind.LOCKED: status.HTTP_429_TOO_MANY_REQUESTS,
    AuthErrorKind.CLOSED: status.HTTP_403_FORBIDDEN,
    AuthErrorKind.UNAVAILABLE: status.HTTP_503_SERVICE_UNAVAILABLE,
    AuthErrorKind.NOT_FOUND: status.HTTP_404_NOT_FOUND,
}


# --- request / response models ---------------------------------------------------


class KdfIn(BaseModel):
    salt: str = B64
    memlimit: int
    opslimit: int


class KdfOut(BaseModel):
    salt: str
    memlimit: int
    opslimit: int


class SignupIn(BaseModel):
    user_id: str
    username: str = Field(max_length=200)
    kdf: KdfIn
    auth_key: str = B64
    recovery_auth_key: str = B64
    uk_by_mk: str = B64
    uk_by_rk: str = B64
    ak_by_uk: str = B64
    ak_sealed: str = B64


class SignupOut(BaseModel):
    user_id: str
    totp_secret: str
    totp_uri: str


class ConfirmIn(BaseModel):
    user_id: str
    totp: str = Code


class PreloginIn(BaseModel):
    username: str = Field(max_length=200)


class LoginIn(BaseModel):
    username: str = Field(max_length=200)
    auth_key: str = B64
    totp: str = Code


class AgentKeyOut(BaseModel):
    version: int
    ak_by_uk: str


class SessionOut(BaseModel):
    id: int
    device: str
    created_at: datetime
    expires_at: datetime
    last_seen_at: datetime
    unlocked_until: datetime | None
    current: bool = False


class LoginOut(BaseModel):
    """Everything a client needs to unwrap UK and AK (all encrypted)."""

    user_id: str
    username: str
    uk_by_mk: str
    agent_key: AgentKeyOut
    session: SessionOut


class KeysOut(BaseModel):
    """Encrypted keys of the account: a device unwraps them with the master password."""

    user_id: str
    uk_by_mk: str
    agent_key: AgentKeyOut


class UnlockIn(BaseModel):
    auth_key: str = B64


class MeOut(BaseModel):
    user_id: str
    username: str
    session: SessionOut


class NewPasswordIn(BaseModel):
    kdf: KdfIn
    auth_key: str = B64
    uk_by_mk: str = B64


class PasswordChangeIn(BaseModel):
    current_auth_key: str = B64
    totp: str = Code
    new: NewPasswordIn


class RecoverStartIn(BaseModel):
    username: str = Field(max_length=200)
    recovery_auth_key: str = B64
    totp: str = Code


class RecoverStartOut(BaseModel):
    user_id: str
    ticket: str
    uk_by_rk: str
    agent_key: AgentKeyOut


class RecoverCompleteIn(BaseModel):
    ticket: str = Field(min_length=20, max_length=200)
    new: NewPasswordIn
    recovery_auth_key: str = B64
    uk_by_rk: str = B64


class StatusOut(BaseModel):
    registration_open: bool


# --- helpers -----------------------------------------------------------------------


def _raise(exc: AuthError) -> NoReturn:
    headers = None
    if exc.kind is AuthErrorKind.LOCKED and exc.retry_after is not None:
        seconds = max(1, ceil((exc.retry_after - utcnow()).total_seconds()))
        headers = {"Retry-After": str(seconds)}
    raise HTTPException(_STATUS[exc.kind], str(exc), headers=headers) from None


def _bad(exc: v.InvalidInputError) -> NoReturn:
    raise HTTPException(status.HTTP_422_UNPROCESSABLE_CONTENT, str(exc)) from None


def _set_cookie(response: Response, settings: Settings, token: str) -> None:
    response.set_cookie(
        sessions.COOKIE_NAME,
        token,
        max_age=settings.device_session_days * 86400,
        path="/api",
        secure=True,
        httponly=True,
        samesite="strict",
    )


def _clear_cookie(response: Response) -> None:
    response.delete_cookie(
        sessions.COOKIE_NAME, path="/api", secure=True, httponly=True, samesite="strict"
    )


def _session_out(row: DeviceSession, current: DeviceSession | None = None) -> SessionOut:
    out = SessionOut.model_validate(row, from_attributes=True)
    out.current = current is not None and current.id == row.id
    return out


def _login_out(result: accounts.LoginResult) -> LoginOut:
    return LoginOut(
        user_id=result.user.id,
        username=result.user.username,
        uk_by_mk=b64url_encode(result.user.uk_by_mk),
        agent_key=AgentKeyOut(
            version=result.agent_key.version, ak_by_uk=b64url_encode(result.agent_key.ak_by_uk)
        ),
        session=_session_out(result.device_session, result.device_session),
    )


def _new_password(body: NewPasswordIn) -> credentials.NewMasterPassword:
    return credentials.NewMasterPassword(
        salt=v.salt(body.kdf.salt),
        params=v.kdf_params(body.kdf.memlimit, body.kdf.opslimit),
        auth_key=v.raw_key(body.auth_key, "auth_key"),
        uk_by_mk=v.wrapped_key(body.uk_by_mk, "uk_by_mk"),
    )


# --- routes ------------------------------------------------------------------------


@router.get("/status")
def get_status(db: DbDep) -> StatusOut:
    return StatusOut(registration_open=accounts.registration_open(db))


@router.post("/signup", status_code=status.HTTP_201_CREATED)
def post_signup(
    body: SignupIn, db: DbDep, settings: SettingsDep, totp_key: TotpKeyDep
) -> SignupOut:
    try:
        key_id = accounts.server_key_id(db)
        user_id = v.user_id(body.user_id)
        username = v.normalize_username(body.username)
        req = accounts.SignupRequest(
            user_id=user_id,
            username=username,
            salt=v.salt(body.kdf.salt),
            params=v.kdf_params(body.kdf.memlimit, body.kdf.opslimit),
            auth_key=v.raw_key(body.auth_key, "auth_key"),
            recovery_auth_key=v.raw_key(body.recovery_auth_key, "recovery_auth_key"),
            uk_by_mk=v.wrapped_key(body.uk_by_mk, "uk_by_mk"),
            uk_by_rk=v.wrapped_key(body.uk_by_rk, "uk_by_rk"),
            ak_by_uk=v.wrapped_key(body.ak_by_uk, "ak_by_uk"),
            ak_sealed=v.sealed_agent_key(body.ak_sealed, user_id, 1, key_id),
        )
        secret = accounts.signup(db, settings, totp_key, req, utcnow())
    except v.InvalidInputError as exc:
        _bad(exc)
    except AuthError as exc:
        _raise(exc)
    # The TOTP seed is returned once, to enrol the authenticator app.
    return SignupOut(
        user_id=user_id, totp_secret=secret, totp_uri=totp.provisioning_uri(secret, username)
    )


@router.post("/signup/confirm")
def post_signup_confirm(
    body: ConfirmIn,
    response: Response,
    db: DbDep,
    settings: SettingsDep,
    totp_key: TotpKeyDep,
    user_agent: UserAgent = "",
) -> LoginOut:
    try:
        result = accounts.confirm_signup(
            db, settings, totp_key, v.user_id(body.user_id), body.totp, user_agent, utcnow()
        )
    except v.InvalidInputError as exc:
        _bad(exc)
    except AuthError as exc:
        _raise(exc)
    _set_cookie(response, settings, result.token)
    return _login_out(result)


@router.post("/prelogin")
def post_prelogin(body: PreloginIn, db: DbDep, settings: SettingsDep) -> KdfOut:
    try:
        username = v.normalize_username(body.username)
    except v.InvalidInputError as exc:
        _bad(exc)
    salt, params = accounts.prelogin(settings, db, username)
    return KdfOut(salt=b64url_encode(salt), memlimit=params.memlimit, opslimit=params.opslimit)


@router.post("/login")
def post_login(
    body: LoginIn,
    response: Response,
    db: DbDep,
    settings: SettingsDep,
    totp_key: TotpKeyDep,
    dummy: DummyDep,
    user_agent: UserAgent = "",
) -> LoginOut:
    try:
        result = accounts.login(
            db,
            settings,
            totp_key,
            dummy,
            v.normalize_username(body.username),
            v.raw_key(body.auth_key, "auth_key"),
            body.totp,
            user_agent,
            utcnow(),
        )
    except v.InvalidInputError:
        # Same answer as wrong credentials: no hint about the expected format of a username.
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, accounts.INVALID) from None
    except AuthError as exc:
        _raise(exc)
    _set_cookie(response, settings, result.token)
    return _login_out(result)


@router.post("/unlock")
def post_unlock(body: UnlockIn, row: SessionDep, db: DbDep, settings: SettingsDep) -> SessionOut:
    try:
        accounts.unlock(db, settings, row, v.raw_key(body.auth_key, "auth_key"), utcnow())
    except v.InvalidInputError as exc:
        _bad(exc)
    except AuthError as exc:
        _raise(exc)
    return _session_out(row, row)


@router.post("/lock", status_code=status.HTTP_204_NO_CONTENT)
def post_lock(row: SessionDep, db: DbDep) -> None:
    sessions.lock(db, row)
    audit.record(db, Actor.USER, "auth.lock", user_id=row.user_id)


@router.post("/logout", status_code=status.HTTP_204_NO_CONTENT)
def post_logout(response: Response, row: SessionDep, db: DbDep) -> None:
    user_id = row.user_id
    if row.id is not None:
        sessions.revoke(db, row.id)
    audit.record(db, Actor.USER, "auth.logout", user_id=user_id)
    _clear_cookie(response)


@router.get("/me")
def get_me(row: SessionDep, db: DbDep) -> MeOut:
    user = accounts.session_user(db, row)
    return MeOut(user_id=user.id, username=user.username, session=_session_out(row, row))


@router.get("/keys")
def get_keys(row: SessionDep, db: DbDep) -> KeysOut:
    user = accounts.session_user(db, row)
    agent_key = accounts.latest_agent_key(db, user.id)
    return KeysOut(
        user_id=user.id,
        uk_by_mk=b64url_encode(user.uk_by_mk),
        agent_key=AgentKeyOut(
            version=agent_key.version, ak_by_uk=b64url_encode(agent_key.ak_by_uk)
        ),
    )


@router.get("/sessions")
def get_sessions(row: SessionDep, db: DbDep) -> list[SessionOut]:
    return [_session_out(s, row) for s in sessions.list_for(db, row.user_id, utcnow())]


@router.delete("/sessions/{session_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_session(session_id: int, row: UnlockedDep, db: DbDep) -> None:
    target = db.get(DeviceSession, session_id)
    if target is None or target.user_id != row.user_id:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Session introuvable.")
    sessions.revoke(db, session_id)
    audit.record(
        db,
        Actor.USER,
        "auth.session.revoke",
        user_id=row.user_id,
        target_type="session",
        target_id=session_id,
    )


@router.post("/password")
def post_password(
    body: PasswordChangeIn, row: UnlockedDep, db: DbDep, settings: SettingsDep, totp_key: TotpKeyDep
) -> SessionOut:
    try:
        credentials.change_password(
            db,
            settings,
            totp_key,
            row,
            v.raw_key(body.current_auth_key, "current_auth_key"),
            body.totp,
            _new_password(body.new),
            utcnow(),
        )
    except v.InvalidInputError as exc:
        _bad(exc)
    except AuthError as exc:
        _raise(exc)
    return _session_out(row, row)


@router.post("/recover/start")
def post_recover_start(
    body: RecoverStartIn, db: DbDep, settings: SettingsDep, totp_key: TotpKeyDep, dummy: DummyDep
) -> RecoverStartOut:
    try:
        result = credentials.start_recovery(
            db,
            settings,
            totp_key,
            dummy,
            v.normalize_username(body.username),
            v.raw_key(body.recovery_auth_key, "recovery_auth_key"),
            body.totp,
            utcnow(),
        )
    except v.InvalidInputError:
        raise HTTPException(
            status.HTTP_401_UNAUTHORIZED, "Clé de récupération ou code incorrect."
        ) from None
    except AuthError as exc:
        _raise(exc)
    return RecoverStartOut(
        user_id=result.user.id,
        ticket=result.ticket,
        uk_by_rk=b64url_encode(result.user.uk_by_rk),
        agent_key=AgentKeyOut(
            version=result.agent_key.version, ak_by_uk=b64url_encode(result.agent_key.ak_by_uk)
        ),
    )


@router.post("/recover/complete")
def post_recover_complete(
    body: RecoverCompleteIn,
    response: Response,
    db: DbDep,
    settings: SettingsDep,
    user_agent: UserAgent = "",
) -> LoginOut:
    try:
        result = credentials.complete_recovery(
            db,
            settings,
            body.ticket,
            _new_password(body.new),
            v.raw_key(body.recovery_auth_key, "recovery_auth_key"),
            v.wrapped_key(body.uk_by_rk, "uk_by_rk"),
            user_agent,
            utcnow(),
        )
    except v.InvalidInputError as exc:
        _bad(exc)
    except AuthError as exc:
        _raise(exc)
    _set_cookie(response, settings, result.token)
    return _login_out(result)
