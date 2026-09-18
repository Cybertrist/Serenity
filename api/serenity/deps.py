"""FastAPI dependencies: settings, database session, authenticated user."""

from collections.abc import Iterator
from typing import Annotated

from fastapi import Cookie, Depends, HTTPException, Request, status
from sqlmodel import Session

from serenity.auth import sessions
from serenity.config import Settings
from serenity.models import AuthSession, utcnow


def get_settings(request: Request) -> Settings:
    settings: Settings = request.app.state.settings
    return settings


def get_db(request: Request) -> Iterator[Session]:
    with Session(request.app.state.engine) as session:
        yield session


SettingsDep = Annotated[Settings, Depends(get_settings)]
DbDep = Annotated[Session, Depends(get_db)]


def require_session(
    db: DbDep,
    settings: SettingsDep,
    token: Annotated[str | None, Cookie(alias=sessions.COOKIE_NAME)] = None,
) -> AuthSession:
    row = None
    if token:
        row = sessions.get_session(db, settings.secret_key.get_secret_value(), token, utcnow())
    if row is None:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Non authentifié.")
    return row


AuthDep = Annotated[AuthSession, Depends(require_session)]
