"""Audit journal routes (read-only)."""

from datetime import datetime
from typing import Annotated, Any

from fastapi import APIRouter, Query
from pydantic import BaseModel
from sqlmodel import col, select

from serenity.deps import AuthDep, DbDep
from serenity.models import Actor, AuditLog

router = APIRouter(prefix="/api/logs", tags=["logs"])


class AuditLogOut(BaseModel):
    id: int
    created_at: datetime
    actor: Actor
    action: str
    outcome: str
    target_type: str | None
    target_id: str | None
    details: dict[str, Any]


@router.get("")
def list_logs(
    db: DbDep,
    _session: AuthDep,
    limit: Annotated[int, Query(ge=1, le=500)] = 100,
    before_id: Annotated[int | None, Query(ge=1)] = None,
) -> list[AuditLogOut]:
    """Most recent audit lines first. Paginate with `before_id`."""
    query = select(AuditLog).order_by(col(AuditLog.id).desc()).limit(limit)
    if before_id is not None:
        query = query.where(col(AuditLog.id) < before_id)
    return [AuditLogOut.model_validate(row, from_attributes=True) for row in db.exec(query)]
