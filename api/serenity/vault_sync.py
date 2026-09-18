"""Mirror vault login items into `Entry` metadata rows (never the passwords)."""

import logging
from dataclasses import asdict, dataclass
from datetime import datetime

from sqlalchemy import Engine
from sqlmodel import Session, select

from serenity import audit, policy
from serenity.models import Actor, Criticality, Entry, Setting, utcnow
from serenity.vault import VaultError, VaultItem
from serenity.vault_service import VaultService

logger = logging.getLogger(__name__)

LAST_SYNC_KEY = "vault_last_sync"


@dataclass(frozen=True)
class SyncReport:
    added: int = 0
    updated: int = 0
    removed: int = 0
    total: int = 0


def sync_entries(session: Session, items: list[VaultItem], now: datetime) -> SyncReport:
    entries = {e.vault_item_id: e for e in session.exec(select(Entry))}
    added = updated = removed = 0
    seen: set[str] = set()

    for item in items:
        seen.add(item.id)
        entry = entries.get(item.id)
        if entry is None:
            # Unknown accounts are critical until the user says otherwise:
            # the agent never acts alone on them.
            entry = Entry(vault_item_id=item.id, name=item.name, criticality=Criticality.CRITICAL)
            _apply(entry, item, now)
            added += 1
        elif _apply(entry, item, now):
            updated += 1
        entry.last_synced_at = now
        session.add(entry)

    for vault_item_id, entry in entries.items():
        if vault_item_id not in seen and entry.removed_at is None:
            entry.removed_at = now
            entry.updated_at = now
            session.add(entry)
            removed += 1

    session.commit()
    return SyncReport(added=added, updated=updated, removed=removed, total=len(items))


def _apply(entry: Entry, item: VaultItem, now: datetime) -> bool:
    """Copy item metadata onto the entry. Returns True if something changed."""
    changed_at = item.password_changed_at
    values = {
        "name": item.name,
        "domain": item.domain,
        "password_changed_at": changed_at,
        "next_rotation_at": policy.next_rotation_at(changed_at, entry.rotation_interval_days, now),
        "removed_at": None,
    }
    changed = any(getattr(entry, k) != v for k, v in values.items())
    if changed:
        for key, value in values.items():
            setattr(entry, key, value)
        entry.updated_at = now
    return changed


def run_sync(service: VaultService, engine: Engine, actor: Actor = Actor.AGENT) -> SyncReport:
    """Pull the vault and refresh entries. Every run is written to the audit journal."""
    with Session(engine) as session:
        now = utcnow()
        try:
            vault = service.ready()
            vault.sync()
            items = vault.list_items()
        except VaultError as exc:
            logger.warning("vault sync failed: %s", exc)
            audit.record(
                session, actor, "vault.sync", outcome="failure", details={"error": str(exc)}
            )
            raise
        report = sync_entries(session, items, now)
        row = session.get(Setting, LAST_SYNC_KEY) or Setting(key=LAST_SYNC_KEY)
        row.value = {"at": now.isoformat(), **asdict(report)}
        row.updated_at = now
        session.add(row)
        session.commit()
        audit.record(session, actor, "vault.sync", details=asdict(report))
        return report
