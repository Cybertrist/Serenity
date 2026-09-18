"""Vault operations: create, update with revision check, trash, history, delegation, sync.

Every write bumps the user's change sequence and writes an audit line (never the content).
"""

from dataclasses import dataclass
from datetime import datetime, timedelta

from sqlmodel import Session, col, delete, select

from serenity import audit
from serenity.models import Actor, Item, ItemRevision, User, Zone
from serenity.vault.errors import ConflictError, InvalidRequestError, NotFoundError

HISTORY_LIMIT = 10
TRASH_DAYS = 30
BATCH_LIMIT = 1000


@dataclass(frozen=True)
class NewItem:
    id: str
    block: bytes


@dataclass(frozen=True)
class SyncResult:
    seq: int
    items: list[Item]


def _next_seq(session: Session, user_id: str) -> int:
    user = session.get(User, user_id)
    if user is None:
        raise NotFoundError("Compte introuvable.")
    user.vault_seq += 1
    session.add(user)
    return user.vault_seq


def _get(session: Session, user_id: str, item_id: str) -> Item:
    item = session.get(Item, item_id)
    if item is None or item.user_id != user_id or item.purged_at is not None:
        raise NotFoundError("Entrée introuvable.")
    return item


def _check_revision(item: Item, base_revision: int) -> None:
    if item.revision != base_revision:
        raise ConflictError("Entrée modifiée ailleurs entre-temps : recharge-la.", item)


def _archive(session: Session, item: Item, now: datetime) -> None:
    """Keep the current version in the history, then trim it to the 10 most recent."""
    if item.block is None:
        return
    session.add(
        ItemRevision(
            item_id=item.id,
            revision=item.revision,
            zone=item.zone,
            block=item.block,
            created_at=now,
        )
    )
    session.flush()
    keep = select(ItemRevision.id).where(ItemRevision.item_id == item.id)
    keep = keep.order_by(col(ItemRevision.revision).desc()).limit(HISTORY_LIMIT)
    session.exec(
        delete(ItemRevision).where(
            col(ItemRevision.item_id) == item.id, col(ItemRevision.id).not_in(keep)
        )
    )


def create_items(
    session: Session,
    user_id: str,
    new_items: list[NewItem],
    now: datetime,
    actor: Actor = Actor.USER,
) -> list[Item]:
    """New entries always start in the personal zone, revision 1 (docs/crypto.md §7.4)."""
    if not new_items or len(new_items) > BATCH_LIMIT:
        raise InvalidRequestError(f"1 à {BATCH_LIMIT} entrées par envoi.")
    ids = [n.id for n in new_items]
    if (
        len(set(ids)) != len(ids)
        or session.exec(select(Item.id).where(col(Item.id).in_(ids))).first()
    ):
        raise InvalidRequestError("Identifiant d'entrée déjà utilisé.")
    created = []
    for new in new_items:
        item = Item(
            id=new.id,
            user_id=user_id,
            zone=Zone.PERSONAL,
            revision=1,
            block=new.block,
            seq=_next_seq(session, user_id),
            created_at=now,
            updated_at=now,
        )
        session.add(item)
        created.append(item)
    session.commit()
    action = "vault.item.create" if len(created) == 1 else "vault.item.import"
    audit.record(
        session,
        actor,
        action,
        user_id=user_id,
        details={"count": len(created)},
        target_type="item",
        target_id=created[0].id if len(created) == 1 else None,
    )
    for item in created:
        session.refresh(item)
    return created


def update_item(
    session: Session,
    user_id: str,
    item_id: str,
    base_revision: int,
    block: bytes,
    now: datetime,
    actor: Actor = Actor.USER,
) -> Item:
    """New revision in the same zone. The block must be encrypted for `base_revision + 1`."""
    item = _get(session, user_id, item_id)
    if item.deleted_at is not None:
        raise InvalidRequestError("Entrée dans la corbeille : restaure-la d'abord.")
    _check_revision(item, base_revision)
    return _replace(session, item, item.zone, block, now, actor, "vault.item.update")


def change_zone(
    session: Session,
    user_id: str,
    item_id: str,
    base_revision: int,
    target: Zone,
    block: bytes,
    now: datetime,
) -> Item:
    """Delegation (personal -> agent) or reclaim (agent -> personal), re-encrypted by the client.

    On reclaim, the agent-zone history is deleted: the server could read it (docs/crypto.md §7.6).
    """
    item = _get(session, user_id, item_id)
    if item.deleted_at is not None:
        raise InvalidRequestError("Entrée dans la corbeille : restaure-la d'abord.")
    if item.zone == target:
        raise InvalidRequestError("L'entrée est déjà dans cette zone.")
    _check_revision(item, base_revision)
    action = "vault.item.delegate" if target == Zone.AGENT else "vault.item.reclaim"
    item = _replace(session, item, target, block, now, Actor.USER, action)
    if target == Zone.PERSONAL:
        session.exec(
            delete(ItemRevision).where(
                col(ItemRevision.item_id) == item.id, col(ItemRevision.zone) == Zone.AGENT
            )
        )
        session.commit()
    return item


def _replace(
    session: Session, item: Item, zone: Zone, block: bytes, now: datetime, actor: Actor, action: str
) -> Item:
    _archive(session, item, now)
    item.zone = zone
    item.revision += 1
    item.block = block
    item.updated_at = now
    item.seq = _next_seq(session, item.user_id)
    session.add(item)
    session.commit()
    audit.record(
        session,
        actor,
        action,
        user_id=item.user_id,
        target_type="item",
        target_id=item.id,
        details={"revision": item.revision, "zone": item.zone.value},
    )
    session.refresh(item)
    return item


def trash_item(
    session: Session, user_id: str, item_id: str, base_revision: int, now: datetime
) -> Item:
    item = _get(session, user_id, item_id)
    _check_revision(item, base_revision)
    if item.deleted_at is None:
        item.deleted_at = now
        item.seq = _next_seq(session, user_id)
        session.add(item)
        session.commit()
        audit.record(
            session,
            Actor.USER,
            "vault.item.trash",
            user_id=user_id,
            target_type="item",
            target_id=item.id,
        )
        session.refresh(item)
    return item


def restore_item(session: Session, user_id: str, item_id: str, now: datetime) -> Item:
    item = _get(session, user_id, item_id)
    if item.deleted_at is not None:
        item.deleted_at = None
        item.updated_at = now
        item.seq = _next_seq(session, user_id)
        session.add(item)
        session.commit()
        audit.record(
            session,
            Actor.USER,
            "vault.item.restore",
            user_id=user_id,
            target_type="item",
            target_id=item.id,
        )
        session.refresh(item)
    return item


def purge_trash(session: Session, user_id: str, now: datetime) -> int:
    """Erase entries in the trash for more than 30 days. The row stays as a tombstone."""
    expired = session.exec(
        select(Item).where(
            Item.user_id == user_id,
            col(Item.deleted_at) < now - timedelta(days=TRASH_DAYS),
            col(Item.purged_at).is_(None),
        )
    ).all()
    for item in expired:
        item.block = None
        item.purged_at = now
        item.seq = _next_seq(session, user_id)
        session.add(item)
        session.exec(delete(ItemRevision).where(col(ItemRevision.item_id) == item.id))
    if expired:
        session.commit()
        audit.record(
            session,
            Actor.SYSTEM,
            "vault.trash.purge",
            user_id=user_id,
            details={"count": len(expired)},
        )
    return len(expired)


def changes_since(session: Session, user_id: str, since: int, now: datetime) -> SyncResult:
    """Every item changed after `since` (0 = everything), tombstones included."""
    purge_trash(session, user_id, now)
    user = session.get(User, user_id)
    if user is None:
        raise NotFoundError("Compte introuvable.")
    rows = session.exec(
        select(Item).where(Item.user_id == user_id, col(Item.seq) > since).order_by(col(Item.seq))
    ).all()
    return SyncResult(seq=user.vault_seq, items=list(rows))


def history(session: Session, user_id: str, item_id: str) -> list[ItemRevision]:
    item = _get(session, user_id, item_id)
    return list(
        session.exec(
            select(ItemRevision)
            .where(ItemRevision.item_id == item.id)
            .order_by(col(ItemRevision.revision).desc())
        )
    )
