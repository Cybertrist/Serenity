"""VaultPort over the real vault: the agent zone, opened with AK (docs/crypto.md §7.12).

The plaintext entry exists here and nowhere else in the server: in this object, for the length
of one rotation. Nothing it holds is logged, and the audit lines carry revisions, never values.
"""

from dataclasses import dataclass
from datetime import datetime
from typing import Any

from sqlmodel import Session

from serenity.crypto import contexts, items
from serenity.models import Item, Zone
from serenity.vault import service


@dataclass
class AgentVault:
    """One entry, for one rotation. Built by the caller, which already opened AK."""

    session: Session
    item: Item
    ak: bytes
    now: datetime
    entry: dict[str, Any] | None = None
    # The password the site was given. Kept to re-encrypt if the entry moves under us.
    _rotated: str = ""

    def __repr__(self) -> str:
        return f"AgentVault(item_id={self.item.id!r}, revision={self.item.revision})"

    def open(self) -> dict[str, Any]:
        """Decrypt the current entry. Raises if the block does not belong to this revision."""
        if self.item.block is None:
            raise ValueError("entrée vide")
        context = contexts.item(
            self.item.user_id, self.item.id, Zone.AGENT.value, self.item.revision
        )
        self.entry = items.decrypt_item(self.ak, self.item.block, context)
        return self.entry

    # --- VaultPort ---------------------------------------------------------------------

    def _wrap(self, entry: dict[str, Any], revision: int) -> bytes:
        rotated = dict(entry)
        rotated["password"] = self._rotated
        rotated["passwordChangedAt"] = self.now.isoformat(timespec="milliseconds").replace(
            "+00:00", "Z"
        )
        context = contexts.item(self.item.user_id, self.item.id, Zone.AGENT.value, revision)
        return items.encrypt_item(self.ak, rotated, context)

    def save_pending(self, new_password: str) -> None:
        self._rotated = new_password
        entry = self.entry or self.open()
        block = self._wrap(entry, self.item.revision + 1)
        self.item = service.save_pending(self.session, self.item, block, self.now)

    def commit_pending(self) -> None:
        """If the entry moved while the site was being changed, keep both: the user's edit
        wins for every field, the rotation wins for the password (docs/crypto.md §7.12)."""
        self.session.refresh(self.item)
        if self.item.pending_revision != self.item.revision + 1:
            current = self.open()  # the edit the user made in the meantime
            self.item.pending_block = self._wrap(current, self.item.revision + 1)
            self.item.pending_revision = self.item.revision + 1
            self.session.add(self.item)
            self.session.commit()
        self.item = service.commit_pending(self.session, self.item, self.now)

    def discard_pending(self) -> None:
        self.item = service.discard_pending(self.session, self.item, self.now)
