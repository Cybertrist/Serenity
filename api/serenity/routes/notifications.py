"""In-app notifications (ADR-005). The client renders the text: no entry name is stored."""

from datetime import datetime
from typing import Annotated

from fastapi import APIRouter, HTTPException, Query, status
from pydantic import BaseModel
from sqlmodel import col, select

from serenity.deps import DbDep, SessionDep
from serenity.models import Notification, utcnow

router = APIRouter(prefix="/api/notifications", tags=["notifications"])


class NotificationOut(BaseModel):
    id: int
    kind: str
    breach_id: int | None
    item_id: str | None
    created_at: datetime
    read_at: datetime | None


@router.get("")
def get_notifications(
    row: SessionDep,
    db: DbDep,
    since: Annotated[int, Query(ge=0)] = 0,
    limit: Annotated[int, Query(ge=1, le=200)] = 50,
) -> list[NotificationOut]:
    """Notifications newer than `since` (an id): what the Android app polls in V2."""
    rows = db.exec(
        select(Notification)
        .where(Notification.user_id == row.user_id, col(Notification.id) > since)
        .order_by(col(Notification.id).desc())
        .limit(limit)
    ).all()
    return [NotificationOut.model_validate(n, from_attributes=True) for n in rows]


@router.post("/{notification_id}/read")
def post_read(notification_id: int, row: SessionDep, db: DbDep) -> NotificationOut:
    notification = db.get(Notification, notification_id)
    if notification is None or notification.user_id != row.user_id:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Notification introuvable.")
    notification.read_at = notification.read_at or utcnow()
    db.add(notification)
    db.commit()
    db.refresh(notification)
    return NotificationOut.model_validate(notification, from_attributes=True)


@router.post("/read-all", status_code=status.HTTP_204_NO_CONTENT)
def post_read_all(row: SessionDep, db: DbDep) -> None:
    now = utcnow()
    for notification in db.exec(
        select(Notification).where(
            Notification.user_id == row.user_id, col(Notification.read_at).is_(None)
        )
    ):
        notification.read_at = now
        db.add(notification)
    db.commit()
