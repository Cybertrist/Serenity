"""Run the four entry checks on decrypted entries. Returns alerts without any secret."""

from collections import defaultdict
from dataclasses import dataclass
from datetime import datetime
from typing import Any

from serenity.models import BreachKind
from serenity.watcher import rules
from serenity.watcher.pwned import PwnedPasswords


@dataclass(frozen=True)
class ScannedEntry:
    item_id: str
    entry: dict[str, Any]
    created_at: datetime

    def __repr__(self) -> str:
        return f"ScannedEntry(item_id={self.item_id!r})"


@dataclass(frozen=True)
class Alert:
    item_id: str
    kind: BreachKind


def analyze(
    entries: list[ScannedEntry], now: datetime, pwned: PwnedPasswords | None
) -> list[Alert]:
    alerts: list[Alert] = []
    by_password: dict[str, list[str]] = defaultdict(list)
    for scanned in entries:
        password = scanned.entry.get("password") or ""
        if not isinstance(password, str) or not password:
            continue
        by_password[password].append(scanned.item_id)
        if rules.is_weak(password):
            alerts.append(Alert(scanned.item_id, BreachKind.WEAK))
        changed = rules.parse_date(scanned.entry.get("passwordChangedAt")) or scanned.created_at
        if rules.is_old(changed, now):
            alerts.append(Alert(scanned.item_id, BreachKind.OLD))
        if pwned is not None and pwned.occurrences(password) > 0:
            alerts.append(Alert(scanned.item_id, BreachKind.PWNED_PASSWORD))
    for item_ids in by_password.values():
        if len(item_ids) > 1:
            alerts.extend(Alert(item_id, BreachKind.REUSED) for item_id in item_ids)
    return alerts
