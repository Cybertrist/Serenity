"""Entry routes: metadata of the watched vault items (never a password)."""

from datetime import datetime

from fastapi import APIRouter
from pydantic import BaseModel
from sqlmodel import col, select

from serenity.deps import AuthDep, DbDep
from serenity.models import Criticality, Entry

router = APIRouter(prefix="/api/entries", tags=["entries"])


class EntryOut(BaseModel):
    id: int
    name: str
    domain: str | None
    criticality: Criticality
    rotation_interval_days: int | None
    password_changed_at: datetime | None
    next_rotation_at: datetime | None
    last_synced_at: datetime | None


@router.get("")
def list_entries(db: DbDep, _session: AuthDep) -> list[EntryOut]:
    query = select(Entry).where(col(Entry.removed_at).is_(None)).order_by(col(Entry.name))
    return [EntryOut.model_validate(e, from_attributes=True) for e in db.exec(query)]
