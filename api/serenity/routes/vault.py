"""Vault routes: connection status and manual sync."""

from dataclasses import asdict
from datetime import datetime
from typing import Any

from fastapi import APIRouter, HTTPException, Request, status
from pydantic import BaseModel
from sqlmodel import col, func, select

from serenity.deps import AuthDep, DbDep
from serenity.models import Actor, Entry, Setting, utcnow
from serenity.vault import VaultError
from serenity.vault_service import VaultService, VaultState
from serenity.vault_sync import LAST_SYNC_KEY, run_sync

router = APIRouter(prefix="/api/vault", tags=["vault"])


class VaultStatus(BaseModel):
    state: VaultState
    last_error: str | None
    last_sync: dict[str, Any] | None
    entries: int


class SyncResult(BaseModel):
    added: int
    updated: int
    removed: int
    total: int
    finished_at: datetime


def _service(request: Request) -> VaultService:
    service: VaultService = request.app.state.vault
    return service


@router.get("/status")
def get_status(request: Request, db: DbDep, _session: AuthDep) -> VaultStatus:
    service = _service(request)
    last = db.get(Setting, LAST_SYNC_KEY)
    count = db.exec(select(func.count()).select_from(Entry).where(col(Entry.removed_at).is_(None)))
    return VaultStatus(
        state=service.state,
        last_error=service.last_error,
        last_sync=last.value if last else None,
        entries=count.one(),
    )


@router.post("/sync")
def post_sync(request: Request, _session: AuthDep) -> SyncResult:
    service = _service(request)
    try:
        report = run_sync(service, request.app.state.engine, actor=Actor.USER)
    except VaultError as exc:
        raise HTTPException(status.HTTP_502_BAD_GATEWAY, f"Coffre indisponible : {exc}") from None
    return SyncResult(**asdict(report), finished_at=utcnow())
