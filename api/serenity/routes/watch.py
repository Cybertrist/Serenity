"""Breach watch routes: scan reports from the browser, alerts, watched e-mail addresses."""

from datetime import datetime
from typing import Annotated, Any, Literal

from fastapi import APIRouter, HTTPException, Query, status
from pydantic import BaseModel, Field
from sqlmodel import col, select

from serenity import audit
from serenity.auth.validation import InvalidInputError
from serenity.auth.validation import user_id as check_uuid
from serenity.deps import DbDep, SessionDep, SettingsDep, UnlockedDep
from serenity.models import (
    ITEM_BREACH_KINDS,
    Actor,
    Breach,
    BreachKind,
    BreachStatus,
    WatchedEmail,
    utcnow,
)
from serenity.watcher import service
from serenity.watcher.checks import Alert

router = APIRouter(prefix="/api", tags=["watch"])

MAX_SCAN = 5000
MAX_EMAILS = 20


class AlertIn(BaseModel):
    item_id: str
    kind: Literal["pwned_password", "reused", "weak", "old"]


AlertKind = Literal["pwned_password", "reused", "weak", "old"]


ALL_KINDS: tuple[AlertKind, ...] = ("pwned_password", "reused", "weak", "old")


class ReportIn(BaseModel):
    """A full scan done in the browser: entry ids and alert kinds only, never a secret.

    `checked` lists the kinds this scan really verified (e.g. without Pwned Passwords when it
    was unreachable): only those alerts can be opened or resolved.
    """

    scanned: list[str] = Field(max_length=MAX_SCAN)
    checked: list[AlertKind] = Field(default_factory=lambda: list(ALL_KINDS))
    alerts: list[AlertIn] = Field(max_length=MAX_SCAN * len(ITEM_BREACH_KINDS))


class SummaryOut(BaseModel):
    new: int
    open: int
    resolved: int


class BreachOut(BaseModel):
    id: int
    kind: BreachKind
    item_id: str | None
    source: str
    status: BreachStatus
    details: dict[str, Any]
    first_seen_at: datetime
    last_seen_at: datetime
    resolved_at: datetime | None


class EmailIn(BaseModel):
    email: str = Field(min_length=3, max_length=254, pattern=r"^[^@\s]+@[^@\s]+\.[^@\s]+$")


class EmailOut(BaseModel):
    id: int
    email: str
    added_at: datetime
    last_checked_at: datetime | None


class EmailsOut(BaseModel):
    # False when HIBP_API_KEY is not set: addresses are kept but not checked.
    enabled: bool
    emails: list[EmailOut]


@router.post("/watch/report")
def post_report(body: ReportIn, row: UnlockedDep, db: DbDep) -> SummaryOut:
    try:
        scanned = [check_uuid(i) for i in body.scanned]
        alerts = [Alert(check_uuid(a.item_id), BreachKind(a.kind)) for a in body.alerts]
        kinds = tuple(BreachKind(k) for k in dict.fromkeys(body.checked))
        summary = service.record_item_scan(
            db, row.user_id, scanned, alerts, "client", utcnow(), kinds=kinds
        )
    except (InvalidInputError, service.InvalidReportError) as exc:
        raise HTTPException(status.HTTP_422_UNPROCESSABLE_CONTENT, str(exc)) from None
    return SummaryOut(new=summary.new, open=summary.open, resolved=summary.resolved)


@router.get("/breaches")
def get_breaches(
    row: SessionDep,
    db: DbDep,
    state: Annotated[Literal["open", "all"], Query(alias="status")] = "open",
) -> list[BreachOut]:
    query = select(Breach).where(Breach.user_id == row.user_id)
    if state == "open":
        query = query.where(Breach.status == BreachStatus.OPEN)
    rows = db.exec(query.order_by(col(Breach.last_seen_at).desc())).all()
    return [BreachOut.model_validate(b, from_attributes=True) for b in rows]


@router.post("/breaches/{breach_id}/dismiss")
def post_dismiss(breach_id: int, row: UnlockedDep, db: DbDep) -> BreachOut:
    try:
        breach = service.dismiss(db, row.user_id, breach_id, utcnow())
    except service.InvalidReportError as exc:
        raise HTTPException(status.HTTP_404_NOT_FOUND, str(exc)) from None
    return BreachOut.model_validate(breach, from_attributes=True)


def _emails(db: DbDep, user_id: str, settings: SettingsDep) -> EmailsOut:
    rows = db.exec(select(WatchedEmail).where(WatchedEmail.user_id == user_id)).all()
    key = settings.hibp_api_key
    return EmailsOut(
        enabled=settings.hibp_enabled or bool(key and key.get_secret_value()),
        emails=[EmailOut.model_validate(r, from_attributes=True) for r in rows],
    )


@router.get("/watch/emails")
def get_emails(row: SessionDep, db: DbDep, settings: SettingsDep) -> EmailsOut:
    return _emails(db, row.user_id, settings)


@router.post("/watch/emails", status_code=status.HTTP_201_CREATED)
def post_email(body: EmailIn, row: UnlockedDep, db: DbDep, settings: SettingsDep) -> EmailsOut:
    email = body.email.strip().lower()
    existing = db.exec(select(WatchedEmail).where(WatchedEmail.user_id == row.user_id)).all()
    if email not in {e.email for e in existing}:
        if len(existing) >= MAX_EMAILS:
            raise HTTPException(
                status.HTTP_422_UNPROCESSABLE_CONTENT, f"{MAX_EMAILS} adresses au plus."
            )
        db.add(WatchedEmail(user_id=row.user_id, email=email))
        db.commit()
        audit.record(db, Actor.USER, "watch.email.add", user_id=row.user_id)
    return _emails(db, row.user_id, settings)


@router.delete("/watch/emails/{email_id}")
def delete_email(email_id: int, row: UnlockedDep, db: DbDep, settings: SettingsDep) -> EmailsOut:
    watched = db.get(WatchedEmail, email_id)
    if watched is None or watched.user_id != row.user_id:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Adresse introuvable.")
    db.delete(watched)
    db.commit()
    audit.record(db, Actor.USER, "watch.email.remove", user_id=row.user_id)
    return _emails(db, row.user_id, settings)
