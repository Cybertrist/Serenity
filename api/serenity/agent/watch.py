"""Server-side watch, agent zone only (docs/05-veille.md).

The agent opens AK with the server key, decrypts the agent-zone entries in memory, runs the
checks, and only stores alerts (entry id + kind). Personal entries are never touched: they are
not even selected, and AK could not decrypt them.
"""

import logging
from dataclasses import dataclass
from datetime import datetime

import httpx
from sqlalchemy import Engine
from sqlmodel import Session, desc, select

from serenity import audit
from serenity.agent import killswitch
from serenity.crypto import contexts, items, sealed
from serenity.crypto.errors import CryptoError
from serenity.models import Actor, AgentKey, BreachKind, Item, User, UserStatus, WatchedEmail, Zone
from serenity.watcher import service
from serenity.watcher.checks import ScannedEntry, analyze
from serenity.watcher.hibp import Hibp
from serenity.watcher.pwned import PwnedPasswords

logger = logging.getLogger(__name__)

# The agent cannot see the personal zone, so it cannot tell whether a password is reused there:
# reuse is left to the browser scan, which sees both zones.
AGENT_KINDS = (BreachKind.PWNED_PASSWORD, BreachKind.WEAK, BreachKind.OLD)


@dataclass
class WatchReport:
    users: int = 0
    scanned: int = 0
    new_alerts: int = 0
    skipped: bool = False


def open_agent_key(user: User, row: AgentKey, server_key: bytes) -> bytes:
    public, secret = sealed.server_keypair(server_key)
    return sealed.open_sealed(
        public, secret, row.ak_sealed, contexts.ak_by_sk(user.id, row.version)
    )


def agent_entries(session: Session, user: User, ak: bytes) -> list[ScannedEntry]:
    rows = session.exec(select(Item).where(Item.user_id == user.id, Item.zone == Zone.AGENT)).all()
    scanned = []
    for item in rows:
        if item.deleted_at is not None or item.block is None:
            continue
        ctx = contexts.item(user.id, item.id, Zone.AGENT.value, item.revision)
        scanned.append(
            ScannedEntry(item.id, items.decrypt_item(ak, item.block, ctx), item.created_at)
        )
    return scanned


def watch_user(
    session: Session, user: User, server_key: bytes, pwned: PwnedPasswords, now: datetime
) -> int:
    row = session.exec(
        select(AgentKey).where(AgentKey.user_id == user.id).order_by(desc(AgentKey.version))
    ).first()
    if row is None:
        return 0
    ak = open_agent_key(user, row, server_key)
    scanned = agent_entries(session, user, ak)
    alerts = [a for a in analyze(scanned, now, pwned) if a.kind in AGENT_KINDS]
    summary = service.record_item_scan(
        session,
        user.id,
        [s.item_id for s in scanned],
        alerts,
        "agent",
        now,
        zone=Zone.AGENT,
        kinds=AGENT_KINDS,
    )
    return summary.new


def watch_emails(session: Session, user: User, hibp: Hibp, now: datetime) -> int:
    new = 0
    for watched in session.exec(select(WatchedEmail).where(WatchedEmail.user_id == user.id)).all():
        if killswitch.is_engaged(session):
            break
        found = hibp.breaches(watched.email)
        new += service.record_email_breaches(
            session, user.id, watched.email, [(b.name, b.date) for b in found], now
        )
        watched.last_checked_at = now
        session.add(watched)
        session.commit()
    return new


def run_watch(
    engine: Engine,
    server_key: bytes,
    pwned: PwnedPasswords,
    hibp: Hibp | None,
    now: datetime,
) -> WatchReport:
    report = WatchReport()
    with Session(engine) as session:
        users = session.exec(select(User).where(User.status == UserStatus.ACTIVE)).all()
        for user in users:
            # Checked before every action, not only at the start of the run.
            if killswitch.is_engaged(session):
                report.skipped = True
                audit.record(
                    session,
                    Actor.AGENT,
                    "agent.watch",
                    user_id=user.id,
                    outcome="skipped",
                    details={"reason": "kill_switch"},
                )
                break
            try:
                report.new_alerts += watch_user(session, user, server_key, pwned, now)
                if hibp is not None:
                    report.new_alerts += watch_emails(session, user, hibp, now)
                report.users += 1
            except (CryptoError, httpx.HTTPError, service.InvalidReportError) as exc:
                session.rollback()
                logger.warning("watch failed for a user: %s", type(exc).__name__)
                audit.record(
                    session,
                    Actor.AGENT,
                    "agent.watch",
                    user_id=user.id,
                    outcome="failure",
                    details={"error": type(exc).__name__},
                )
    return report
