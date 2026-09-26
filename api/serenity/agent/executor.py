"""Runs the rotations that are waiting: the last mile the agent was missing (docs/crypto.md §7.12).

Order of the guards, all of them code and all of them before a browser exists:
kill switch, zone, daily limit, allowlist (inside `RotationRun.execute`), one rotation at a time
(each one is claimed by a conditional UPDATE before anything else happens).
The transaction itself belongs to `rotator.base`; this module only feeds it and records
what came out.
"""

import logging
from dataclasses import dataclass
from datetime import datetime, timedelta

import httpx
from sqlalchemy import Engine, and_, or_
from sqlmodel import Session, col, desc, func, select, update

from serenity import audit
from serenity.agent import killswitch
from serenity.agent.allowlist import AllowlistError, host_of, load_allowlist
from serenity.agent.policy import next_rotation_at
from serenity.agent.watch import open_agent_key
from serenity.config import Settings
from serenity.models import (
    Actor,
    AgentKey,
    Breach,
    BreachKind,
    BreachStatus,
    Item,
    Notification,
    PolicyMode,
    Rotation,
    RotationPolicy,
    RotationStatus,
    User,
    UserStatus,
    Zone,
)
from serenity.rotator.base import Credentials, RotationRun, Step
from serenity.rotator.passwords import new_password
from serenity.rotator.remote import RemoteSiteRotator
from serenity.rotator.vault import AgentVault

logger = logging.getLogger(__name__)

ROTATION_DONE = "rotation.done"
ROTATION_FAILED = "rotation.failed"
ROTATION_MANUAL = "rotation.manual"

# Shown as is in the interface: this site has no recipe, so nothing will happen.
NO_RECIPE = "aucune recette pour ce site : l'agent ne sait pas encore le changer"
# Shown as is too: the rotation waits, it has not failed.
DAILY_LIMIT = "limite de rotations par jour atteinte : la rotation attend le lendemain"
# The agent stopped in the middle of a rotation: the site may hold either password.
INTERRUPTED = "rotation interrompue par un arrêt de l'agent : vérifie ce compte"

# A failed rotation is not retried at the next hourly pass, but the day after: a site that
# refuses must not be hammered every hour.
RETRY_AFTER_FAILURE = timedelta(days=1)
DAY = timedelta(days=1)

# What the user sees, and what the journal keeps. Never a password, never a page.
OUTCOME = {
    Step.COMMITTED: ("succeeded", ROTATION_DONE),
    Step.ROLLED_BACK: ("rolled_back", ROTATION_FAILED),
    Step.FAILED: ("failed", ROTATION_MANUAL),
}


@dataclass
class ExecutionReport:
    run: int = 0
    succeeded: int = 0
    rolled_back: int = 0
    failed: int = 0
    skipped: bool = False


def recipes_of(settings: Settings, client: httpx.Client) -> dict[str, frozenset[str]]:
    """Ask the executor what sites it knows. Unknown site: the rotation simply waits."""
    token = settings.rotator_token.get_secret_value() if settings.rotator_token else ""
    response = client.get(
        f"{settings.rotator_url.rstrip('/')}/recettes",
        headers={"authorization": f"Bearer {token}"},
    )
    response.raise_for_status()
    return {r["name"]: frozenset(r["domains"]) for r in response.json()["recipes"]}


def _pick_recipe(urls: list[str], recipes: dict[str, frozenset[str]]) -> str | None:
    hosts = [host_of(u) for u in urls if u.strip()]
    for name, domains in sorted(recipes.items()):
        if hosts and all(
            any(h == d or h.endswith("." + d) for d in domains) for h in hosts if h is not None
        ):
            return name
    return None


def _waiting(session: Session) -> list[Rotation]:
    """Approved by the user, or scheduled on an entry the user left autonomous."""
    return list(
        session.exec(
            select(Rotation)
            .where(
                col(Rotation.status).in_((RotationStatus.APPROVED, RotationStatus.SCHEDULED)),
            )
            .order_by(col(Rotation.requested_at))
        ).all()
    )


def _runnable(session: Session, rotation: Rotation) -> Item | None:
    if rotation.status == RotationStatus.SCHEDULED and rotation.mode != PolicyMode.AUTONOMOUS:
        return None  # waits for a human yes
    item = session.get(Item, rotation.item_id)
    if item is None or item.zone != Zone.AGENT or item.deleted_at is not None:
        return None
    return item


def started_since(session: Session, user_id: str, since: datetime) -> int:
    """Rotations that really started (touched, or were about to touch, a site) since `since`.

    Counted on `started_at`: an autonomous rotation has no decision date, and it is exactly
    the one the daily limit exists for."""
    count = session.exec(
        select(func.count())
        .select_from(Rotation)
        .where(Rotation.user_id == user_id, col(Rotation.started_at) > since)
    ).one()
    return int(count)


def _claim(session: Session, rotation: Rotation, now: datetime) -> bool:
    """Take the rotation in one statement. Two passes (a slow run and the next one, or the
    agent and `make rotate-now`) can both see it waiting: only one gets rowcount 1."""
    result = session.exec(
        update(Rotation)
        .where(
            col(Rotation.id) == rotation.id,
            or_(
                col(Rotation.status) == RotationStatus.APPROVED,
                and_(
                    col(Rotation.status) == RotationStatus.SCHEDULED,
                    col(Rotation.mode) == PolicyMode.AUTONOMOUS,
                ),
            ),
        )
        .values(status=RotationStatus.IN_PROGRESS, started_at=now, error=None)
        .execution_options(synchronize_session=False)
    )
    session.commit()
    session.refresh(rotation)
    return result.rowcount == 1


def _postpone(session: Session, rotation: Rotation, item: Item, message: str, reason: str) -> None:
    """Not a failure, but it must not look like silence either: an approved rotation that
    sleeps for ever is the thing phase 6 was built to avoid. Say it on the rotation, once."""
    if rotation.error == message:
        return
    rotation.error = message
    session.add(rotation)
    session.commit()
    audit.record(
        session,
        Actor.AGENT,
        "agent.rotation.execute",
        outcome="skipped",
        user_id=item.user_id,
        target_type="item",
        target_id=item.id,
        details={"reason": reason},
    )


def _after(session: Session, item_id: str, committed: bool, now: datetime) -> None:
    """What a finished rotation changes around it: the due date, and the leak it answered."""
    policy = session.get(RotationPolicy, item_id)
    if committed:
        if policy is not None:
            # The password just changed: the next one is a full period away.
            policy.changed_at = now
            policy.next_due_at = next_rotation_at(now, policy.frequency_days, now)
            policy.updated_at = now
            session.add(policy)
        # The exposed password is gone from the vault and from the site.
        for breach in session.exec(
            select(Breach).where(
                Breach.item_id == item_id,
                Breach.kind == BreachKind.PWNED_PASSWORD,
                Breach.status == BreachStatus.OPEN,
            )
        ):
            breach.status, breach.resolved_at = BreachStatus.RESOLVED, now
            session.add(breach)
    elif policy is not None and policy.next_due_at is not None and policy.next_due_at <= now:
        policy.next_due_at = now + RETRY_AFTER_FAILURE
        policy.updated_at = now
        session.add(policy)


def _finish(
    session: Session,
    rotation: Rotation,
    item_id: str,
    user_id: str,
    step: Step,
    history: list[Step],
    error: str | None,
    now: datetime,
) -> None:
    status, kind = OUTCOME.get(step, ("failed", ROTATION_MANUAL))
    rotation.status = RotationStatus(status)
    rotation.error = error
    rotation.finished_at = now
    session.add(rotation)
    _after(session, item_id, step == Step.COMMITTED, now)
    session.add(Notification(user_id=user_id, kind=kind, item_id=item_id, created_at=now))
    session.commit()
    audit.record(
        session,
        Actor.AGENT,
        "agent.rotation.execute",
        outcome="success" if step == Step.COMMITTED else "failure",
        user_id=user_id,
        target_type="item",
        target_id=item_id,
        details={"steps": [s.value for s in history], "error": error},
    )


def execute_rotation(
    session: Session,
    settings: Settings,
    rotation: Rotation,
    item: Item,
    server_key: bytes,
    recipes: dict[str, frozenset[str]],
    client: httpx.Client,
    now: datetime,
    allowlist: frozenset[str] | None = None,
) -> Step:
    """One rotation, from the vault to the site and back. Never raises once the site may have
    been touched: from the claim on, any error ends as a FAILED rotation, pending block kept."""
    user = session.get(User, item.user_id)
    key_row = session.exec(
        select(AgentKey).where(AgentKey.user_id == item.user_id).order_by(desc(AgentKey.version))
    ).first()
    if user is None or key_row is None:
        return Step.FAILED
    ak = open_agent_key(user, key_row, server_key)
    vault = AgentVault(session=session, item=item, ak=ak, now=now)
    entry = vault.open()
    urls = [u for u in entry.get("urls", []) if isinstance(u, str) and u.strip()]
    recipe = _pick_recipe(urls, recipes)
    if recipe is None:
        # Not a failure: nobody taught the executor this site yet.
        _postpone(session, rotation, item, NO_RECIPE, "no_recipe")
        return Step.READY
    # Everything that can fail without touching anything happens before the claim: once the
    # rotation is IN_PROGRESS, it must reach an end.
    if allowlist is None:
        allowlist = load_allowlist(settings.allowlist_file)
    token = settings.rotator_token.get_secret_value() if settings.rotator_token else ""
    site = RemoteSiteRotator(
        base_url=settings.rotator_url,
        token=token,
        recipe=recipe,
        site_url=urls[0],
        domains=recipes[recipe],
        totp_uri=str(entry.get("totp") or ""),
        client=client,
    )
    run = RotationRun(urls=urls, allowlist=allowlist)
    current = Credentials(str(entry.get("username") or ""), str(entry.get("password") or ""))
    item_id, user_id = item.id, item.user_id

    if not _claim(session, rotation, now):
        return Step.READY  # another pass took it

    try:
        run.execute(site, vault, current, new_password())
    except Exception as exc:
        # The site may have moved: nothing is discarded, the pending block (if any) stays for
        # the user to arbitrate, exactly like a rollback that could not finish.
        logger.warning("rotation stopped by an unexpected error: %s", type(exc).__name__)
        session.rollback()
        run.error = f"erreur inattendue ({type(exc).__name__}) : vérifie ce compte"
        run.step = Step.FAILED
        run.history.append(Step.FAILED)
    _finish(session, rotation, item_id, user_id, run.step, run.history, run.error, now)
    return run.step


def fail_rotation(
    session: Session, rotation_id: int, error: str, now: datetime, reason: str = "error"
) -> None:
    """End a rotation that could not reach its own end. Nothing is discarded from the vault."""
    rotation = session.get(Rotation, rotation_id, populate_existing=True)
    if rotation is None:
        return
    rotation.status = RotationStatus.FAILED
    rotation.error = error
    rotation.finished_at = now
    session.add(rotation)
    _after(session, rotation.item_id, False, now)
    session.add(
        Notification(
            user_id=rotation.user_id, kind=ROTATION_MANUAL, item_id=rotation.item_id, created_at=now
        )
    )
    session.commit()
    audit.record(
        session,
        Actor.AGENT,
        "agent.rotation.execute",
        outcome="failure",
        user_id=rotation.user_id,
        target_type="item",
        target_id=rotation.item_id,
        details={"reason": reason, "error": error},
    )


def recover_interrupted(session: Session, now: datetime) -> int:
    """At agent start: a rotation still IN_PROGRESS was cut off by a crash or a restart.

    Nobody will ever finish it, and the site may hold either password. It becomes FAILED, the
    pending block (if any) stays, and the user is told to look."""
    ids = session.exec(
        select(Rotation.id).where(Rotation.status == RotationStatus.IN_PROGRESS)
    ).all()
    for rotation_id in ids:
        if rotation_id is not None:
            fail_rotation(session, rotation_id, INTERRUPTED, now, reason="interrupted")
    return len(ids)


def run_rotations(
    engine: Engine,
    server_key: bytes,
    settings: Settings,
    now: datetime,
    http: httpx.Client | None = None,
) -> ExecutionReport:
    """Called by the agent scheduler, right after the due dates are refreshed.

    `http` talks to the executor; tests hand in one on a mock transport."""
    report = ExecutionReport()
    if not settings.rotator_url or settings.rotator_token is None:
        return report  # no executor configured: approved rotations keep waiting
    with Session(engine) as session:
        if killswitch.is_engaged(session):
            report.skipped = True
            audit.record(
                session,
                Actor.AGENT,
                "agent.rotation.execute",
                outcome="skipped",
                details={"reason": "kill_switch"},
            )
            session.commit()
            return report
        active = {
            u.id for u in session.exec(select(User).where(User.status == UserStatus.ACTIVE)).all()
        }
        waiting = [r for r in _waiting(session) if r.user_id in active]
        if not waiting:
            return report
        try:
            allowlist = load_allowlist(settings.allowlist_file)
        except (OSError, AllowlistError):
            logger.warning("allowlist unreadable: rotations postponed")
            return report
        with http or httpx.Client(timeout=float(settings.rotator_timeout_seconds)) as client:
            try:
                recipes = recipes_of(settings, client)
            except (httpx.HTTPError, KeyError, ValueError):
                logger.warning("rotator unreachable: rotations postponed")
                return report
            for rotation in waiting:
                # The switch can be thrown while a batch is running: check before each one.
                if killswitch.is_engaged(session):
                    report.skipped = True
                    break
                item = _runnable(session, rotation)
                if item is None:
                    continue
                if (
                    started_since(session, item.user_id, now - DAY)
                    >= settings.max_rotations_per_day
                ):
                    _postpone(session, rotation, item, DAILY_LIMIT, "daily_limit")
                    continue
                rotation_id = rotation.id
                try:
                    step = execute_rotation(
                        session,
                        settings,
                        rotation,
                        item,
                        server_key,
                        recipes,
                        client,
                        now,
                        allowlist,
                    )
                except Exception as exc:
                    # One unreadable entry (a CryptoError, a vanished key) must not stop the
                    # whole batch: this rotation fails, with a line in the journal, the next
                    # one runs.
                    logger.warning("rotation could not start: %s", type(exc).__name__)
                    session.rollback()
                    if rotation_id is not None:
                        fail_rotation(session, rotation_id, f"erreur ({type(exc).__name__})", now)
                    step = Step.FAILED
                if step == Step.READY:
                    continue
                report.run += 1
                report.succeeded += step == Step.COMMITTED
                report.rolled_back += step == Step.ROLLED_BACK
                report.failed += step == Step.FAILED
    return report
