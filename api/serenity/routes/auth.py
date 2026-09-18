"""Authentication routes: login, logout, current session."""

from datetime import datetime
from math import ceil
from typing import Annotated

from fastapi import APIRouter, Cookie, HTTPException, Response, status
from pydantic import BaseModel, Field

from serenity import audit
from serenity.auth import sessions
from serenity.auth.login import LoginError, login
from serenity.deps import AuthDep, DbDep, SettingsDep
from serenity.models import Actor, utcnow

router = APIRouter(prefix="/api/auth", tags=["auth"])


class LoginRequest(BaseModel):
    password: str = Field(min_length=1, max_length=1024)
    totp: str = Field(min_length=6, max_length=6)


class SessionInfo(BaseModel):
    authenticated: bool
    expires_at: datetime


@router.post("/login", status_code=status.HTTP_204_NO_CONTENT)
def post_login(body: LoginRequest, response: Response, db: DbDep, settings: SettingsDep) -> None:
    now = utcnow()
    result = login(db, settings, body.password, body.totp, now)
    if result.error is LoginError.NOT_CONFIGURED:
        raise HTTPException(
            status.HTTP_503_SERVICE_UNAVAILABLE,
            "Identifiants non initialisés : lance `python -m serenity.auth init`.",
        )
    if result.error is LoginError.LOCKED and result.retry_after is not None:
        seconds = max(1, ceil((result.retry_after - now).total_seconds()))
        raise HTTPException(
            status.HTTP_429_TOO_MANY_REQUESTS,
            "Trop de tentatives. Réessaie plus tard.",
            headers={"Retry-After": str(seconds)},
        )
    if result.token is None:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Identifiants invalides.")
    response.set_cookie(
        sessions.COOKIE_NAME,
        result.token,
        max_age=settings.session_ttl_hours * 3600,
        path="/api",
        secure=True,
        httponly=True,
        samesite="strict",
    )


@router.post("/logout", status_code=status.HTTP_204_NO_CONTENT)
def post_logout(
    response: Response,
    db: DbDep,
    settings: SettingsDep,
    _session: AuthDep,
    token: Annotated[str | None, Cookie(alias=sessions.COOKIE_NAME)] = None,
) -> None:
    if token:
        sessions.revoke_session(db, settings.secret_key.get_secret_value(), token)
    audit.record(db, Actor.USER, "auth.logout")
    response.delete_cookie(
        sessions.COOKIE_NAME, path="/api", secure=True, httponly=True, samesite="strict"
    )


@router.get("/me")
def get_me(session: AuthDep) -> SessionInfo:
    return SessionInfo(authenticated=True, expires_at=session.expires_at)
