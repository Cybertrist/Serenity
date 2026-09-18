"""Rotation lifecycle in V1: due dates, reminders, scheduling, approve / refuse.

Nothing is executed on a site in V1: an approved rotation waits for the V3 executor.
Every guard is code: zone (agent only), kill switch, allowlist, daily limit.
"""

from dataclasses import dataclass
from datetime import datetime, timedelta

from sqlmodel import Session, col, func, select

from serenity import audit
from serenity.agent import killswitch
from serenity.agent.policy import is_rotation_due, next_rotation_at
from serenity.models import (
    OPEN_ROTATION_STATUSES,
    POLICY_FREQUENCIES,
    Actor,
    Breach,
    BreachKind,
    BreachStatus,
    Item,
    Notification,
    PolicyMode,
    Rotation,
    RotationPolicy,
    RotationStatus,
    Zone,
)

ROTATION_DUE = "rotation.due"
REMINDER_DUE = "reminder.due"


class RotationRefusedError(ValueError):
    """A guard refused the action. The message is safe to show."""


@dataclass
class ScheduleReport:
    scheduled: int = 0
    reminders: int = 0
    skipped: bool = False


# --- policies ----------------------------------------------------------------------------


def set_policy(
    session: Session,
    user_id: str,
    item: Item,
    frequency_days: int | None,
    mode: PolicyMode,
    changed_at: datetime | None,
    now: datetime,
) -> RotationPolicy:
    if frequency_days is not None and frequency_days not in POLICY_FREQUENCIES:
        raise RotationRefusedError("fréquence : 7, 30, 90, 180 jours ou jamais")
    if item.zone == Zone.PERSONAL and mode == PolicyMode.AUTONOMOUS:
        # The agent cannot read personal entries: reminders only, never a rotation.
        raise RotationRefusedError("zone personnelle : rappels seulement, pas de mode autonome")
    policy = session.get(RotationPolicy, item.id) or RotationPolicy(
        item_id=item.id, user_id=user_id
    )
    policy.frequency_days = frequency_days
    policy.mode = mode
    policy.changed_at = changed_at or policy.changed_at or item.created_at
    policy.next_due_at = next_rotation_at(policy.changed_at, frequency_days, now)
    policy.updated_at = now
    session.add(policy)
    session.commit()
    audit.record(
        session,
        Actor.USER,
        "agent.policy.set",
        user_id=user_id,
        target_type="item",
        target_id=item.id,
        details={"frequency_days": frequency_days, "mode": mode.value, "zone": item.zone.value},
    )
    session.refresh(policy)
    return policy


# --- scheduling (agent process) ----------------------------------------------------------


def _open_rotation(session: Session, item_id: str) -> Rotation | None:
    return session.exec(
        select(Rotation).where(
            Rotation.item_id == item_id, col(Rotation.status).in_(OPEN_ROTATION_STATUSES)
        )
    ).first()


def _schedule(
    session: Session, item: Item, mode: PolicyMode, trigger: str, now: datetime
) -> Rotation:
    if item.zone != Zone.AGENT:
        # Defence in depth: callers only select agent items, but this must never happen.
        raise RotationRefusedError("l'agent ne touche jamais une entrée personnelle")
    rotation = Rotation(
        user_id=item.user_id, item_id=item.id, trigger=trigger, mode=mode, requested_at=now
    )
    session.add(rotation)
    session.flush()
    session.add(
        Notification(user_id=item.user_id, kind=ROTATION_DUE, item_id=item.id, created_at=now)
    )
    audit.record(
        session,
        Actor.AGENT,
        "agent.rotation.schedule",
        user_id=item.user_id,
        target_type="item",
        target_id=item.id,
        details={"trigger": trigger, "mode": mode.value},
    )
    return rotation


def run_schedule(session: Session, now: datetime) -> ScheduleReport:
    """Hourly: due policies -> rotations (agent zone) or reminders (personal zone);
    exposed agent-zone passwords -> rotations. The kill switch is checked before each action."""
    report = ScheduleReport()
    policies = session.exec(
        select(RotationPolicy).where(col(RotationPolicy.next_due_at).is_not(None))
    ).all()
    for policy in policies:
        if killswitch.is_engaged(session):
            report.skipped = True
            break
        item = session.get(Item, policy.item_id)
        if (
            item is None
            or item.deleted_at is not None
            or not is_rotation_due(policy.next_due_at, now)
        ):
            continue
        if item.zone == Zone.AGENT:
            if _open_rotation(session, item.id) is None:
                _schedule(session, item, policy.mode, "schedule", now)
                report.scheduled += 1
        elif policy.last_reminded_at is None or policy.last_reminded_at < (
            policy.next_due_at or now
        ):
            policy.last_reminded_at = now
            session.add(policy)
            session.add(
                Notification(
                    user_id=item.user_id, kind=REMINDER_DUE, item_id=item.id, created_at=now
                )
            )
            audit.record(
                session,
                Actor.AGENT,
                "agent.reminder",
                user_id=item.user_id,
                target_type="item",
                target_id=item.id,
            )
            report.reminders += 1
    exposed = session.exec(
        select(Breach).where(
            Breach.kind == BreachKind.PWNED_PASSWORD, Breach.status == BreachStatus.OPEN
        )
    ).all()
    for breach in exposed:
        if report.skipped or killswitch.is_engaged(session):
            report.skipped = True
            break
        item = session.get(Item, breach.item_id) if breach.item_id else None
        if item is None or item.zone != Zone.AGENT or item.deleted_at is not None:
            continue
        if _open_rotation(session, item.id) is None:
            item_policy = session.get(RotationPolicy, item.id)
            mode = item_policy.mode if item_policy else PolicyMode.APPROVAL
            _schedule(session, item, mode, "breach", now)
            report.scheduled += 1
    if report.skipped:
        audit.record(
            session,
            Actor.AGENT,
            "agent.schedule",
            outcome="skipped",
            details={"reason": "kill_switch"},
        )
    session.commit()
    return report


# --- decisions (user, via the API) --------------------------------------------------------


def _rotations_today(session: Session, user_id: str, now: datetime) -> int:
    since = now - timedelta(days=1)
    count = session.exec(
        select(func.count())
        .select_from(Rotation)
        .where(
            Rotation.user_id == user_id,
            col(Rotation.status).in_(
                (RotationStatus.APPROVED, RotationStatus.IN_PROGRESS, RotationStatus.SUCCEEDED)
            ),
            col(Rotation.decided_at) > since,
        )
    ).one()
    return int(count)


def _decidable(session: Session, user_id: str, rotation_id: int) -> tuple[Rotation, Item]:
    rotation = session.get(Rotation, rotation_id)
    if rotation is None or rotation.user_id != user_id:
        raise RotationRefusedError("rotation introuvable")
    if rotation.status != RotationStatus.SCHEDULED:
        raise RotationRefusedError("cette rotation n'attend plus de décision")
    item = session.get(Item, rotation.item_id)
    if item is None or item.zone != Zone.AGENT or item.deleted_at is not None:
        raise RotationRefusedError("l'entrée n'est plus confiée à l'agent")
    return rotation, item


def approve(
    session: Session, user_id: str, rotation_id: int, max_per_day: int, now: datetime
) -> Rotation:
    """Record the user's yes. The allowlist is NOT checked here: the api cannot read agent-zone
    URLs. It is checked by code where a site can be touched: `RotationRun.execute` (agent)."""
    rotation, item = _decidable(session, user_id, rotation_id)
    if killswitch.is_engaged(session):
        raise RotationRefusedError("kill switch enclenché : l'agent est arrêté")
    if _rotations_today(session, user_id, now) >= max_per_day:
        raise RotationRefusedError(f"limite atteinte : {max_per_day} rotation(s) par jour")
    rotation.status, rotation.decided_at = RotationStatus.APPROVED, now
    session.add(rotation)
    session.commit()
    audit.record(
        session,
        Actor.USER,
        "agent.rotation.approve",
        user_id=user_id,
        target_type="item",
        target_id=item.id,
    )
    session.refresh(rotation)
    return rotation


def refuse(session: Session, user_id: str, rotation_id: int, now: datetime) -> Rotation:
    """Refused: no rotation now; the next one is due one period later."""
    rotation, item = _decidable(session, user_id, rotation_id)
    rotation.status, rotation.decided_at = RotationStatus.REFUSED, now
    session.add(rotation)
    policy = session.get(RotationPolicy, item.id)
    if policy is not None and policy.frequency_days:
        policy.next_due_at = now + timedelta(days=policy.frequency_days)
        session.add(policy)
    session.commit()
    audit.record(
        session,
        Actor.USER,
        "agent.rotation.refuse",
        user_id=user_id,
        target_type="item",
        target_id=item.id,
    )
    session.refresh(rotation)
    return rotation
