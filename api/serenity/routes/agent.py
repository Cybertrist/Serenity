"""Agent routes: kill switch, rotation policies, rotations to approve or refuse."""

from datetime import datetime
from typing import Annotated, Literal

from fastapi import APIRouter, HTTPException, Query, status
from pydantic import BaseModel
from sqlmodel import col, select

from serenity.agent import killswitch, rotations
from serenity.agent.allowlist import AllowlistError, load_allowlist
from serenity.auth import sessions
from serenity.deps import DbDep, SessionDep, SettingsDep, UnlockedDep
from serenity.models import (
    OPEN_ROTATION_STATUSES,
    Item,
    PolicyMode,
    Rotation,
    RotationPolicy,
    RotationStatus,
    utcnow,
)

router = APIRouter(prefix="/api", tags=["agent"])


class KillSwitchIn(BaseModel):
    engaged: bool


class AgentStatusOut(BaseModel):
    kill_switch: bool
    kill_switch_changed_at: str | None
    allowlist: list[str]
    max_rotations_per_day: int
    open_rotations: int


class PolicyIn(BaseModel):
    frequency_days: Literal[7, 30, 90, 180] | None
    mode: PolicyMode = PolicyMode.APPROVAL
    # Date of the last password change, read by the client from the decrypted entry.
    changed_at: datetime | None = None


class PolicyOut(BaseModel):
    item_id: str
    frequency_days: int | None
    mode: PolicyMode
    changed_at: datetime | None
    next_due_at: datetime | None


class RotationOut(BaseModel):
    id: int
    item_id: str
    status: RotationStatus
    trigger: str
    mode: PolicyMode
    requested_at: datetime
    decided_at: datetime | None
    finished_at: datetime | None
    error: str | None


def _refused(exc: rotations.RotationRefusedError) -> HTTPException:
    return HTTPException(status.HTTP_422_UNPROCESSABLE_CONTENT, str(exc))


@router.get("/agent/status")
def get_status(row: SessionDep, db: DbDep, settings: SettingsDep) -> AgentStatusOut:
    state = killswitch.state(db)
    try:
        allowlist = sorted(load_allowlist(settings.allowlist_file))
    except (OSError, AllowlistError):
        allowlist = []
    open_count = len(
        db.exec(
            select(Rotation.id).where(
                Rotation.user_id == row.user_id, col(Rotation.status).in_(OPEN_ROTATION_STATUSES)
            )
        ).all()
    )
    return AgentStatusOut(
        kill_switch=state["engaged"],
        kill_switch_changed_at=state["changed_at"],
        allowlist=allowlist,
        max_rotations_per_day=settings.max_rotations_per_day,
        open_rotations=open_count,
    )


@router.post("/agent/kill-switch")
def post_kill_switch(body: KillSwitchIn, row: SessionDep, db: DbDep) -> dict[str, object]:
    """Engaging is always possible with a device session; releasing needs the unlocked level."""
    if not body.engaged and not sessions.is_unlocked(row, utcnow()):
        raise HTTPException(
            status.HTTP_403_FORBIDDEN, "Coffre verrouillé : déverrouille pour relancer l'agent."
        )
    return killswitch.set_engaged(db, body.engaged, row.user_id, utcnow())


def _item(db: DbDep, user_id: str, item_id: str) -> Item:
    item = db.get(Item, item_id)
    if item is None or item.user_id != user_id or item.deleted_at is not None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Entrée introuvable.")
    return item


@router.put("/vault/items/{item_id}/policy")
def put_policy(item_id: str, body: PolicyIn, row: UnlockedDep, db: DbDep) -> PolicyOut:
    item = _item(db, row.user_id, item_id)
    try:
        policy = rotations.set_policy(
            db, row.user_id, item, body.frequency_days, body.mode, body.changed_at, utcnow()
        )
    except rotations.RotationRefusedError as exc:
        raise _refused(exc) from None
    return PolicyOut.model_validate(policy, from_attributes=True)


@router.get("/agent/policies")
def get_policies(row: SessionDep, db: DbDep) -> list[PolicyOut]:
    rows = db.exec(select(RotationPolicy).where(RotationPolicy.user_id == row.user_id)).all()
    return [PolicyOut.model_validate(p, from_attributes=True) for p in rows]


@router.get("/agent/rotations")
def get_rotations(
    row: SessionDep,
    db: DbDep,
    state: Annotated[Literal["open", "all"], Query(alias="status")] = "open",
) -> list[RotationOut]:
    query = select(Rotation).where(Rotation.user_id == row.user_id)
    if state == "open":
        query = query.where(col(Rotation.status).in_(OPEN_ROTATION_STATUSES))
    rows = db.exec(query.order_by(col(Rotation.requested_at).desc())).all()
    return [RotationOut.model_validate(r, from_attributes=True) for r in rows]


@router.post("/agent/rotations/{rotation_id}/approve")
def post_approve(
    rotation_id: int, row: UnlockedDep, db: DbDep, settings: SettingsDep
) -> RotationOut:
    try:
        rotation = rotations.approve(
            db, row.user_id, rotation_id, settings.max_rotations_per_day, utcnow()
        )
    except rotations.RotationRefusedError as exc:
        raise _refused(exc) from None
    return RotationOut.model_validate(rotation, from_attributes=True)


@router.post("/agent/rotations/{rotation_id}/refuse")
def post_refuse(rotation_id: int, row: UnlockedDep, db: DbDep) -> RotationOut:
    try:
        rotation = rotations.refuse(db, row.user_id, rotation_id, utcnow())
    except rotations.RotationRefusedError as exc:
        raise _refused(exc) from None
    return RotationOut.model_validate(rotation, from_attributes=True)
