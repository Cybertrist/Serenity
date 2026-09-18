"""FastAPI dependencies: settings, database, keys, device session and unlocked level."""

from collections.abc import Iterator
from typing import Annotated

from fastapi import Cookie, Depends, HTTPException, Request, status
from sqlmodel import Session

from serenity.auth import sessions
from serenity.auth.hashing import DummyHash
from serenity.config import Settings
from serenity.models import DeviceSession, utcnow


def get_settings(request: Request) -> Settings:
    settings: Settings = request.app.state.settings
    return settings


def get_db(request: Request) -> Iterator[Session]:
    with Session(request.app.state.engine) as session:
        yield session


def get_totp_key(request: Request) -> bytes:
    key: bytes | None = request.app.state.totp_key
    if key is None:
        raise HTTPException(status.HTTP_503_SERVICE_UNAVAILABLE, "Clé TOTP serveur absente.")
    return key


def get_dummy_hash(request: Request) -> DummyHash:
    dummy: DummyHash = request.app.state.dummy_hash
    return dummy


SettingsDep = Annotated[Settings, Depends(get_settings)]
DbDep = Annotated[Session, Depends(get_db)]
TotpKeyDep = Annotated[bytes, Depends(get_totp_key)]
DummyDep = Annotated[DummyHash, Depends(get_dummy_hash)]
TokenCookie = Annotated[str | None, Cookie(alias=sessions.COOKIE_NAME)]


def require_session(db: DbDep, settings: SettingsDep, token: TokenCookie = None) -> DeviceSession:
    """A valid device session (TOTP within the last 60 days). Enough to read encrypted data."""
    now = utcnow()
    row = sessions.find(db, settings, token, now) if token else None
    if row is None:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Non authentifié.")
    sessions.touch(db, settings, row, now, slide=False)
    return row


SessionDep = Annotated[DeviceSession, Depends(require_session)]


def require_unlocked(db: DbDep, settings: SettingsDep, row: SessionDep) -> DeviceSession:
    """Device session unlocked by the master password in the last minutes (sliding)."""
    now = utcnow()
    if not sessions.is_unlocked(row, now):
        raise HTTPException(
            status.HTTP_403_FORBIDDEN,
            "Coffre verrouillé : déverrouille avec ton mot de passe maître.",
        )
    sessions.touch(db, settings, row, now, slide=True)
    return row


UnlockedDep = Annotated[DeviceSession, Depends(require_unlocked)]
