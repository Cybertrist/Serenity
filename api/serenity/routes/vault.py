"""Vault routes: encrypted items, sync, trash, history, delegation (docs/crypto.md §7.4-7.6).

Reading needs a device session; every change needs the unlocked level.
"""

from datetime import datetime
from typing import Annotated, Literal, NoReturn

from fastapi import APIRouter, HTTPException, Query, status
from fastapi.responses import JSONResponse
from pydantic import BaseModel, Field

from serenity.auth import validation as auth_validation
from serenity.crypto.encoding import b64url_encode
from serenity.deps import DbDep, SessionDep, UnlockedDep
from serenity.models import Item, ItemRevision, Zone, utcnow
from serenity.vault import service
from serenity.vault.blocks import MAX_BLOCK_BYTES, item_block
from serenity.vault.errors import ConflictError, InvalidRequestError, NotFoundError

router = APIRouter(prefix="/api/vault", tags=["vault"])

Block = Field(min_length=1, max_length=MAX_BLOCK_BYTES * 2)


class ItemOut(BaseModel):
    id: str
    zone: Zone
    revision: int
    block: str | None
    seq: int
    created_at: datetime
    updated_at: datetime
    deleted_at: datetime | None
    purged: bool


class SyncOut(BaseModel):
    seq: int
    items: list[ItemOut]


class NewItemIn(BaseModel):
    id: str
    block: str = Block


class CreateIn(BaseModel):
    items: list[NewItemIn] = Field(min_length=1, max_length=service.BATCH_LIMIT)


class UpdateIn(BaseModel):
    """`base_revision` is the revision the client edited; the block is for base_revision + 1."""

    base_revision: int = Field(ge=1)
    block: str = Block


class ZoneChangeIn(UpdateIn):
    # Explicit confirmation shown to the user ("L'agent pourra lire ce mot de passe").
    confirm: Literal[True]


class RevisionOut(BaseModel):
    revision: int
    zone: Zone
    block: str
    created_at: datetime


def _out(item: Item) -> ItemOut:
    return ItemOut(
        id=item.id,
        zone=item.zone,
        revision=item.revision,
        block=b64url_encode(item.block) if item.block is not None else None,
        seq=item.seq,
        created_at=item.created_at,
        updated_at=item.updated_at,
        deleted_at=item.deleted_at,
        purged=item.purged_at is not None,
    )


def _fail(exc: Exception) -> NoReturn:
    if isinstance(exc, ConflictError):
        # 409 with the server version, so the client can merge.
        body: dict[str, object] = {
            "detail": str(exc),
            "current": _out(exc.current).model_dump(mode="json"),
        }
        raise ConflictResponse(body)
    if isinstance(exc, NotFoundError):
        raise HTTPException(status.HTTP_404_NOT_FOUND, str(exc)) from None
    if isinstance(exc, InvalidRequestError | auth_validation.InvalidInputError):
        raise HTTPException(status.HTTP_422_UNPROCESSABLE_CONTENT, str(exc)) from None
    raise exc


class ConflictResponse(Exception):
    """Turned into a 409 response carrying the server version of the item."""

    def __init__(self, body: dict[str, object]) -> None:
        self.body = body


def conflict_handler(_request: object, exc: Exception) -> JSONResponse:
    body = exc.body if isinstance(exc, ConflictResponse) else {"detail": "Conflit."}
    return JSONResponse(status_code=status.HTTP_409_CONFLICT, content=body)


@router.get("/items")
def get_items(row: SessionDep, db: DbDep, since: Annotated[int, Query(ge=0)] = 0) -> SyncOut:
    result = service.changes_since(db, row.user_id, since, utcnow())
    return SyncOut(seq=result.seq, items=[_out(i) for i in result.items])


@router.post("/items", status_code=status.HTTP_201_CREATED)
def post_items(body: CreateIn, row: UnlockedDep, db: DbDep) -> list[ItemOut]:
    try:
        new = [
            service.NewItem(id=auth_validation.user_id(i.id), block=item_block(i.block))
            for i in body.items
        ]
        return [_out(i) for i in service.create_items(db, row.user_id, new, utcnow())]
    except (InvalidRequestError, auth_validation.InvalidInputError) as exc:
        _fail(exc)


@router.put("/items/{item_id}")
def put_item(item_id: str, body: UpdateIn, row: UnlockedDep, db: DbDep) -> ItemOut:
    try:
        item = service.update_item(
            db, row.user_id, item_id, body.base_revision, item_block(body.block), utcnow()
        )
    except (ConflictError, NotFoundError, InvalidRequestError) as exc:
        _fail(exc)
    return _out(item)


@router.delete("/items/{item_id}")
def delete_item(
    item_id: str, row: UnlockedDep, db: DbDep, base_revision: Annotated[int, Query(ge=1)]
) -> ItemOut:
    """Move to the trash (erased after 30 days)."""
    try:
        return _out(service.trash_item(db, row.user_id, item_id, base_revision, utcnow()))
    except (ConflictError, NotFoundError) as exc:
        _fail(exc)


@router.post("/items/{item_id}/restore")
def restore_item(item_id: str, row: UnlockedDep, db: DbDep) -> ItemOut:
    try:
        return _out(service.restore_item(db, row.user_id, item_id, utcnow()))
    except NotFoundError as exc:
        _fail(exc)


@router.get("/items/{item_id}/history")
def get_history(item_id: str, row: SessionDep, db: DbDep) -> list[RevisionOut]:
    try:
        revisions = service.history(db, row.user_id, item_id)
    except NotFoundError as exc:
        _fail(exc)
    return [_revision_out(r) for r in revisions]


def _revision_out(r: ItemRevision) -> RevisionOut:
    return RevisionOut(
        revision=r.revision, zone=r.zone, block=b64url_encode(r.block), created_at=r.created_at
    )


@router.post("/items/{item_id}/delegate")
def delegate_item(item_id: str, body: ZoneChangeIn, row: UnlockedDep, db: DbDep) -> ItemOut:
    """Personal -> agent. The client decrypted with UK and re-encrypted with AK."""
    return _zone(item_id, body, row.user_id, db, Zone.AGENT)


@router.post("/items/{item_id}/reclaim")
def reclaim_item(item_id: str, body: ZoneChangeIn, row: UnlockedDep, db: DbDep) -> ItemOut:
    """Agent -> personal. The client decrypted with AK and re-encrypted with UK."""
    return _zone(item_id, body, row.user_id, db, Zone.PERSONAL)


def _zone(item_id: str, body: ZoneChangeIn, user_id: str, db: DbDep, target: Zone) -> ItemOut:
    try:
        item = service.change_zone(
            db, user_id, item_id, body.base_revision, target, item_block(body.block), utcnow()
        )
    except (ConflictError, NotFoundError, InvalidRequestError) as exc:
        _fail(exc)
    return _out(item)
