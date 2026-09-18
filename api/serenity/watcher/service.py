"""Record scan results as alerts (no duplicates) and notify each new alert."""

from dataclasses import dataclass
from datetime import datetime
from typing import Any

from sqlmodel import Session, col, select

from serenity import audit
from serenity.models import (
    ITEM_BREACH_KINDS,
    Actor,
    Breach,
    BreachKind,
    BreachStatus,
    Item,
    Notification,
    Zone,
)
from serenity.watcher.checks import Alert

NEW_BREACH = "breach.new"


class InvalidReportError(ValueError):
    """The report names an unknown entry, a foreign entry or an unexpected kind."""


@dataclass(frozen=True)
class ScanSummary:
    new: int
    open: int
    resolved: int


def _notify(session: Session, breach: Breach) -> None:
    session.add(
        Notification(
            user_id=breach.user_id, kind=NEW_BREACH, breach_id=breach.id, item_id=breach.item_id
        )
    )


def _upsert(
    session: Session,
    user_id: str,
    kind: BreachKind,
    subject: str,
    source: str,
    now: datetime,
    item: Item | None = None,
    details: dict[str, Any] | None = None,
) -> bool:
    """Open or refresh an alert. Returns True when it is new (or reopened) and was notified."""
    breach = session.exec(
        select(Breach).where(
            Breach.user_id == user_id, Breach.subject == subject, Breach.kind == kind
        )
    ).first()
    revision = item.revision if item else None
    if breach is not None:
        breach.last_seen_at = now
        reopen = breach.status == BreachStatus.RESOLVED or (
            breach.status == BreachStatus.DISMISSED and revision != breach.item_revision
        )
        if not reopen:
            session.add(breach)
            return False
        breach.status, breach.resolved_at, breach.item_revision = BreachStatus.OPEN, None, revision
    else:
        breach = Breach(
            user_id=user_id,
            kind=kind,
            subject=subject,
            item_id=item.id if item else None,
            item_revision=revision,
            source=source,
            details=details or {},
            first_seen_at=now,
            last_seen_at=now,
        )
    session.add(breach)
    session.flush()
    _notify(session, breach)
    return True


def record_item_scan(
    session: Session,
    user_id: str,
    scanned_ids: list[str],
    alerts: list[Alert],
    source: str,
    now: datetime,
    *,
    zone: Zone | None = None,
    kinds: tuple[BreachKind, ...] = ITEM_BREACH_KINDS,
) -> ScanSummary:
    """Apply a full scan of `scanned_ids`: open reported alerts, resolve the others.

    `zone` restricts the scan (the agent may only report on the agent zone); `kinds` are the
    kinds this scan is authoritative for (only those are opened or resolved).
    """
    items = {
        i.id: i
        for i in session.exec(
            select(Item).where(Item.user_id == user_id, col(Item.id).in_(scanned_ids))
        )
        if i.deleted_at is None and (zone is None or i.zone == zone)
    }
    if set(scanned_ids) - items.keys():
        raise InvalidReportError("entrée inconnue, supprimée ou hors de la zone autorisée")
    reported = set()
    new = 0
    for alert in alerts:
        if alert.item_id not in items or alert.kind not in kinds:
            raise InvalidReportError("alerte invalide")
        reported.add((alert.item_id, alert.kind))
        new += _upsert(
            session, user_id, alert.kind, alert.item_id, source, now, items[alert.item_id]
        )
    resolved = 0
    for breach in session.exec(
        select(Breach).where(
            Breach.user_id == user_id,
            col(Breach.item_id).in_(list(items)),
            col(Breach.kind).in_(kinds),
            Breach.status == BreachStatus.OPEN,
        )
    ):
        if (breach.item_id, breach.kind) not in reported:
            breach.status, breach.resolved_at = BreachStatus.RESOLVED, now
            session.add(breach)
            resolved += 1
    session.commit()
    summary = ScanSummary(new=new, open=len(reported), resolved=resolved)
    actor = Actor.AGENT if source == "agent" else Actor.USER
    audit.record(
        session,
        actor,
        "watch.scan",
        user_id=user_id,
        details={
            "source": source,
            "scanned": len(items),
            "new": new,
            "open": len(reported),
            "resolved": resolved,
        },
    )
    return summary


def record_email_breaches(
    session: Session,
    user_id: str,
    email: str,
    breaches: list[tuple[str, str | None]],
    now: datetime,
) -> int:
    new = 0
    for name, date in breaches:
        new += _upsert(
            session,
            user_id,
            BreachKind.EMAIL_BREACH,
            f"{email}|{name}",
            "hibp",
            now,
            details={"email": email, "breach": name, "date": date},
        )
    session.commit()
    return new


def dismiss(session: Session, user_id: str, breach_id: int, now: datetime) -> Breach:
    breach = session.get(Breach, breach_id)
    if breach is None or breach.user_id != user_id:
        raise InvalidReportError("alerte introuvable")
    breach.status, breach.resolved_at = BreachStatus.DISMISSED, now
    session.add(breach)
    session.commit()
    audit.record(
        session,
        Actor.USER,
        "watch.dismiss",
        user_id=user_id,
        target_type="breach",
        target_id=breach_id,
    )
    session.refresh(breach)
    return breach
