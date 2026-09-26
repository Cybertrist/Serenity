"""Vault operations: create, update with revision check, trash, history, delegation, sync.

Every write bumps the user's change sequence and writes an audit line (never the content).
"""

from dataclasses import dataclass
from datetime import datetime, timedelta
from typing import Any

from sqlmodel import Session, col, delete, select, update

from serenity import audit
from serenity.models import Actor, Item, ItemRevision, Rotation, RotationStatus, User, Zone
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


# A rotation of the entry that is running or about to run: the pending block is its business.
BUSY_ROTATION_STATUSES = (RotationStatus.APPROVED, RotationStatus.IN_PROGRESS)
# What a reclaim cancels: rotations that have not touched the site yet.
CANCELLABLE_ROTATION_STATUSES = (RotationStatus.SCHEDULED, RotationStatus.APPROVED)

STALE = "Entrée modifiée ailleurs entre-temps : recharge-la."


def _next_seq(session: Session, user_id: str) -> int:
    """Increment in the database, not in Python: the api and the agent write concurrently,
    and a read-modify-write would hand the same number to both."""
    seq = session.exec(
        update(User)
        .where(col(User.id) == user_id)
        .values(vault_seq=col(User.vault_seq) + 1)
        .returning(col(User.vault_seq))
        .execution_options(synchronize_session=False)
    ).scalar_one_or_none()
    if seq is None:
        raise NotFoundError("Compte introuvable.")
    cached = session.identity_map.get(session.identity_key(User, user_id))
    if cached is not None:
        session.expire(cached, ["vault_seq"])
    return int(seq)


def _write(
    session: Session, item: Item, revision: int, message: str, /, *conditions: Any, **values: Any
) -> None:
    """UPDATE the item only if it is still at the revision this request read (plus
    `conditions`). A concurrent writer that got there first turns this one into a conflict,
    never into a silent overwrite."""
    result = session.exec(
        update(Item)
        .where(col(Item.id) == item.id, col(Item.revision) == revision, *conditions)
        .values(**values)
        .execution_options(synchronize_session=False)
    )
    if result.rowcount != 1:
        session.rollback()
        raise ConflictError(message, item)


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
    if item.pending_block is not None:
        raise InvalidRequestError("Rotation en cours sur cette entrée : réessaie après.")
    _check_revision(item, base_revision)
    action = "vault.item.delegate" if target == Zone.AGENT else "vault.item.reclaim"
    item = _replace(session, item, target, block, now, Actor.USER, action)
    if target == Zone.PERSONAL:
        session.exec(
            delete(ItemRevision).where(
                col(ItemRevision.item_id) == item.id, col(ItemRevision.zone) == Zone.AGENT
            )
        )
        cancelled = _cancel_rotations(session, item.id, now)
        session.commit()
        for rotation_id in cancelled:
            audit.record(
                session,
                Actor.USER,
                "agent.rotation.cancel",
                user_id=item.user_id,
                target_type="item",
                target_id=item.id,
                details={"rotation_id": rotation_id, "reason": "reclaimed"},
            )
        session.refresh(item)
    return item


def _cancel_rotations(session: Session, item_id: str, now: datetime) -> list[int]:
    """A reclaimed entry is out of the agent's reach: its waiting rotations must not linger.

    Each one is cancelled only if it is still waiting, in the same statement: a rotation the
    agent claimed in the meantime is left to the agent, which will find a personal entry and
    refuse to touch it."""
    ids = session.exec(
        select(Rotation.id).where(
            Rotation.item_id == item_id,
            col(Rotation.status).in_(CANCELLABLE_ROTATION_STATUSES),
        )
    ).all()
    cancelled = []
    for rotation_id in ids:
        result = session.exec(
            update(Rotation)
            .where(
                col(Rotation.id) == rotation_id,
                col(Rotation.status).in_(CANCELLABLE_ROTATION_STATUSES),
            )
            .values(status=RotationStatus.CANCELLED, finished_at=now)
            .execution_options(synchronize_session=False)
        )
        if result.rowcount == 1 and rotation_id is not None:
            cancelled.append(rotation_id)
    return cancelled


def _replace(
    session: Session,
    item: Item,
    zone: Zone,
    block: bytes,
    now: datetime,
    actor: Actor,
    action: str,
    *,
    clear_pending: bool = False,
) -> Item:
    base = item.revision
    _archive(session, item, now)
    values: dict[str, Any] = {
        "zone": zone,
        "revision": base + 1,
        "block": block,
        "updated_at": now,
        "seq": _next_seq(session, item.user_id),
    }
    if clear_pending:
        values.update(pending_block=None, pending_revision=None)
    _write(session, item, base, STALE, **values)
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


# --- rotation, in three steps (docs/crypto.md §7.12) -----------------------------------------


def save_pending(session: Session, item: Item, block: bytes, now: datetime) -> Item:
    """Hold the next revision aside. The active entry does not move: the site still has it."""
    if item.deleted_at is not None:
        raise InvalidRequestError("Entrée dans la corbeille.")
    if item.zone != Zone.AGENT:
        raise InvalidRequestError("Zone personnelle : l'agent n'y touche pas.")
    busy = "Une rotation est déjà en cours sur cette entrée."
    if item.pending_block is not None:
        raise ConflictError(busy, item)
    # Guarded like any other write: two rotations, or an edit landing at the same moment,
    # must not both believe they hold the pending slot. The seq moves, so every device sees
    # the block (and, if the rotation ends badly, can offer both passwords).
    _write(
        session,
        item,
        item.revision,
        busy,
        col(Item.pending_block).is_(None),
        col(Item.zone) == Zone.AGENT,
        col(Item.deleted_at).is_(None),
        pending_block=block,
        pending_revision=item.revision + 1,
        seq=_next_seq(session, item.user_id),
    )
    session.commit()
    audit.record(
        session,
        Actor.AGENT,
        "vault.item.pending",
        user_id=item.user_id,
        target_type="item",
        target_id=item.id,
        details={"revision": item.pending_revision},
    )
    session.refresh(item)
    return item


def commit_pending(session: Session, item: Item, now: datetime) -> Item:
    """The site took the new password: the pending block becomes the entry.

    The block is bound to its revision by the AEAD context (docs/crypto.md §5.2): committing
    it under any other revision would store something no client could ever open. If the entry
    moved while the rotation was in flight, the caller re-encrypts first.
    """
    if item.pending_block is None:
        raise InvalidRequestError("Aucun bloc en attente.")
    if item.pending_revision != item.revision + 1:
        raise ConflictError("Entrée modifiée pendant la rotation : bloc en attente périmé.", item)
    return _replace(
        session,
        item,
        item.zone,
        item.pending_block,
        now,
        Actor.AGENT,
        "vault.item.rotated",
        clear_pending=True,
    )


def discard_pending(session: Session, item: Item, now: datetime) -> Item:
    """The rotation failed and the site was put back: forget the block, keep the entry."""
    item.pending_block = None
    item.pending_revision = None
    item.updated_at = now
    # Devices that saw the block must see it go away.
    item.seq = _next_seq(session, item.user_id)
    session.add(item)
    session.commit()
    audit.record(
        session,
        Actor.AGENT,
        "vault.item.pending.discarded",
        user_id=item.user_id,
        target_type="item",
        target_id=item.id,
    )
    session.refresh(item)
    return item


def trash_item(
    session: Session, user_id: str, item_id: str, base_revision: int, now: datetime
) -> Item:
    item = _get(session, user_id, item_id)
    _check_revision(item, base_revision)
    if item.deleted_at is None:
        _write(session, item, base_revision, STALE, deleted_at=now, seq=_next_seq(session, user_id))
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


def resolve_pending(session: Session, user_id: str, item_id: str, keep: str, now: datetime) -> Item:
    """The user arbitrates a rotation that could not be undone (docs/crypto.md §7.12, point 7).

    Two passwords exist and only the site knows which one it took, so only a human can say.
    Keeping the pending one promotes it to the current revision; keeping the current one throws
    the other away. Either way the entry leaves the "two passwords" state.
    """
    item = _get(session, user_id, item_id)
    if item.pending_block is None:
        raise InvalidRequestError("Aucun bloc en attente sur cette entrée.")
    if keep not in ("current", "pending"):
        raise InvalidRequestError("Choix inconnu.")
    busy = session.exec(
        select(Rotation.id).where(
            Rotation.item_id == item.id, col(Rotation.status).in_(BUSY_ROTATION_STATUSES)
        )
    ).first()
    if busy is not None:
        # The agent is about to use, or is using, the pending slot: arbitrating now would pull
        # the block from under a rotation that may already have changed the site.
        raise ConflictError(
            "Rotation en cours sur cette entrée : réessaie quand elle sera finie.", item
        )
    if keep == "current":
        item.pending_block = None
        item.pending_revision = None
        item.updated_at = now
        item.seq = _next_seq(session, user_id)
        session.add(item)
        session.commit()
        audit.record(
            session,
            Actor.USER,
            "vault.item.pending.resolved",
            user_id=user_id,
            target_type="item",
            target_id=item.id,
            details={"keep": "current"},
        )
        session.refresh(item)
        return item
    if item.pending_revision != item.revision + 1:
        raise ConflictError("Entrée modifiée depuis : le bloc en attente ne s'applique plus.", item)
    return _replace(
        session,
        item,
        item.zone,
        item.pending_block,
        now,
        Actor.USER,
        "vault.item.pending.resolved",
        clear_pending=True,
    )


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
    # Fresh from the database: the seq moves by SQL, not through the object in this session.
    user = session.get(User, user_id, populate_existing=True)
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
