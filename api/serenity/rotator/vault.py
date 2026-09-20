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

    def save_pending(self, new_password: str) -> None:
        entry = dict(self.entry or self.open())
        entry["password"] = new_password
        entry["passwordChangedAt"] = self.now.isoformat(timespec="milliseconds").replace(
            "+00:00", "Z"
        )
        revision = self.item.revision + 1
        context = contexts.item(self.item.user_id, self.item.id, Zone.AGENT.value, revision)
        block = items.encrypt_item(self.ak, entry, context)
        self.item = service.save_pending(self.session, self.item, block, self.now)

    def commit_pending(self) -> None:
        self.item = service.commit_pending(self.session, self.item, self.now)

    def discard_pending(self) -> None:
        self.item = service.discard_pending(self.session, self.item, self.now)
