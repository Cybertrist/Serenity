"""Password rules shared with the browser (web/src/features/breaches/rules.ts).

Both implementations are checked against shared/test-vectors/watch.json.
"""

import math
import re
from datetime import datetime, timedelta

MIN_LENGTH = 12
MIN_BITS = 60
MIN_DISTINCT = 5
OLD_AFTER = timedelta(days=365)

_POOLS = (
    (re.compile(r"[a-z]"), 26),
    (re.compile(r"[A-Z]"), 26),
    (re.compile(r"[0-9]"), 10),
    (re.compile(r"[^a-zA-Z0-9]"), 33),
)


def strength_bits(password: str) -> float:
    """Brute-force size for the character classes used (an upper bound, not a guess estimate)."""
    pool = sum(size for pattern, size in _POOLS if pattern.search(password))
    return len(password) * math.log2(pool) if pool else 0.0


def is_weak(password: str) -> bool:
    """Too short, too small a character space, or too repetitive. Empty passwords are skipped."""
    if not password:
        return False
    return (
        len(password) < MIN_LENGTH
        or strength_bits(password) < MIN_BITS
        or len(set(password)) < MIN_DISTINCT
    )


def is_old(changed_at: datetime | None, now: datetime) -> bool:
    return changed_at is not None and now - changed_at > OLD_AFTER


def parse_date(value: object) -> datetime | None:
    if not isinstance(value, str) or not value:
        return None
    try:
        return datetime.fromisoformat(value.replace("Z", "+00:00"))
    except ValueError:
        return None
