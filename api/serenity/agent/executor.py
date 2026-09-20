"""Runs the rotations that are waiting: the last mile the agent was missing (docs/crypto.md §7.12).

Order of the guards, all of them code and all of them before a browser exists:
kill switch, zone, allowlist (inside `RotationRun.execute`), one rotation at a time.
The transaction itself belongs to `rotator.base`; this module only feeds it and records
what came out.
"""

import logging
from dataclasses import dataclass
from datetime import datetime

import httpx
from sqlalchemy import Engine
from sqlmodel import Session, col, desc, select

from serenity import audit
from serenity.agent import killswitch
from serenity.agent.allowlist import host_of, load_allowlist
from serenity.agent.watch import open_agent_key
from serenity.config import Settings
from serenity.models import (
    Actor,
    AgentKey,
    Item,
    Notification,
    PolicyMode,
    Rotation,
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


def _finish(
    session: Session, rotation: Rotation, item: Item, run: RotationRun, now: datetime
) -> None:
    status, kind = OUTCOME.get(run.step, ("failed", ROTATION_MANUAL))
    rotation.status = RotationStatus(status)
    rotation.error = run.error
    rotation.finished_at = now
    session.add(rotation)
    session.add(Notification(user_id=item.user_id, kind=kind, item_id=item.id, created_at=now))
    session.commit()
    audit.record(
        session,
        Actor.AGENT,
        "agent.rotation.execute",
        outcome="success" if run.step == Step.COMMITTED else "failure",
        user_id=item.user_id,
        target_type="item",
        target_id=item.id,
        details={"steps": [s.value for s in run.history], "error": run.error},
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
) -> Step:
    """One rotation, from the vault to the site and back. Never raises for a site failure."""
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
        # Not a failure: nobody taught the executor this site yet. It must not look like
        # silence either: an approved rotation that sleeps for ever is the thing phase 6
        # was built to avoid. Say it on the rotation, once.
        if rotation.error != NO_RECIPE:
            rotation.error = NO_RECIPE
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
                details={"reason": "no_recipe"},
            )
        return Step.READY

    rotation.status = RotationStatus.IN_PROGRESS
    rotation.started_at = now
    rotation.error = None
    session.add(rotation)
    session.commit()

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
    run = RotationRun(urls=urls, allowlist=load_allowlist(settings.allowlist_file))
    current = Credentials(str(entry.get("username") or ""), str(entry.get("password") or ""))
    run.execute(site, vault, current, new_password())
    _finish(session, rotation, item, run, now)
    return run.step


def run_rotations(
    engine: Engine, server_key: bytes, settings: Settings, now: datetime
) -> ExecutionReport:
    """Called by the agent scheduler, right after the due dates are refreshed."""
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
        with httpx.Client(timeout=float(settings.rotator_timeout_seconds)) as client:
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
                step = execute_rotation(
                    session, settings, rotation, item, server_key, recipes, client, now
                )
                if step == Step.READY:
                    continue
                report.run += 1
                report.succeeded += step == Step.COMMITTED
                report.rolled_back += step == Step.ROLLED_BACK
                report.failed += step == Step.FAILED
    return report
