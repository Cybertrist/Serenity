"""Record scan results as alerts (no duplicates) and notify each new alert."""

from dataclasses import dataclass
from datetime import datetime, timedelta
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
    ItemScan,
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
    pwned_scope: set[str] | None = None,
) -> ScanSummary:
    """Apply a full scan of `scanned_ids`: open reported alerts, resolve the others.

    `zone` restricts the scan (the agent may only report on the agent zone); `kinds` are the
    kinds this scan is authoritative for (only those are opened or resolved).

    `pwned_scope` are the entries this scan really asked Pwned Passwords about. The local checks
    (reused, weak, old) cost nothing and always cover the whole vault, but the network check is
    spread over time, so an entry outside the scope keeps its exposed-password alert instead of
    having it resolved by a scan that never looked. None means every scanned entry was asked.
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
    if pwned_scope is not None and pwned_scope - items.keys():
        raise InvalidReportError("entrée vérifiée hors du scan")
    reported = set()
    new = 0
    for alert in alerts:
        if alert.item_id not in items or alert.kind not in kinds:
            raise InvalidReportError("alerte invalide")
        if (
            alert.kind == BreachKind.PWNED_PASSWORD
            and pwned_scope is not None
            and alert.item_id not in pwned_scope
        ):
            raise InvalidReportError("mot de passe exposé signalé sans avoir été vérifié")
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
        if (breach.item_id, breach.kind) in reported:
            continue
        # An entry the scan did not ask Pwned Passwords about proves nothing: leave its alert.
        if (
            breach.kind == BreachKind.PWNED_PASSWORD
            and pwned_scope is not None
            and breach.item_id not in pwned_scope
        ):
            continue
        breach.status, breach.resolved_at = BreachStatus.RESOLVED, now
        session.add(breach)
        resolved += 1
    if pwned_scope is not None or BreachKind.PWNED_PASSWORD in kinds:
        checked = pwned_scope if pwned_scope is not None else items.keys()
        for item_id in checked:
            session.merge(
                ItemScan(
                    item_id=item_id,
                    user_id=user_id,
                    pwned_revision=items[item_id].revision,
                    pwned_checked_at=now,
                )
            )
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


@dataclass(frozen=True)
class ScanPlan:
    """Entries whose password still has to be asked about, and when the last one was asked."""

    items: list[str]
    last_scan_at: datetime | None


def scan_plan(session: Session, user_id: str, now: datetime, recheck_hours: int) -> ScanPlan:
    """What the browser still has to send to Pwned Passwords.

    An entry is in the plan when it was never checked, when its password changed since (the
    revision moved), or when the last check is older than `recheck_hours`. Everything else is
    left alone: one network round per entry per day, and a new entry is checked at once.
    """
    checked = {
        row.item_id: row
        for row in session.exec(select(ItemScan).where(ItemScan.user_id == user_id))
    }
    deadline = now - timedelta(hours=recheck_hours)
    items = []
    for item in session.exec(select(Item).where(Item.user_id == user_id)):
        if item.deleted_at is not None:
            continue
        row = checked.get(item.id)
        if row is None or row.pwned_revision != item.revision or row.pwned_checked_at < deadline:
            items.append(item.id)
    last = max((r.pwned_checked_at for r in checked.values()), default=None)
    return ScanPlan(items=items, last_scan_at=last)


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
