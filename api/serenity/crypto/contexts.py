"""Associated-data contexts (docs/crypto.md §5.4)."""

import re

from serenity.crypto.errors import CryptoError

PREFIX = "serenity/v1"
ZONES = ("personal", "agent")
_UUID = re.compile(r"^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$")


def _uuid(value: str) -> str:
    if not _UUID.match(value):
        raise CryptoError("identifiers must be canonical lowercase UUID v4")
    return value


def _positive(value: int) -> str:
    if isinstance(value, bool) or not isinstance(value, int) or value < 1:
        raise CryptoError("versions and revisions must be integers >= 1")
    return str(value)


def uk_by_mk(user_id: str) -> str:
    return f"{PREFIX}/uk-by-mk/{_uuid(user_id)}"


def uk_by_rk(user_id: str) -> str:
    return f"{PREFIX}/uk-by-rk/{_uuid(user_id)}"


def ak_by_uk(user_id: str, ak_version: int) -> str:
    return f"{PREFIX}/ak-by-uk/{_uuid(user_id)}/{_positive(ak_version)}"


def ak_by_sk(user_id: str, ak_version: int) -> str:
    return f"{PREFIX}/ak-by-sk/{_uuid(user_id)}/{_positive(ak_version)}"


def item(user_id: str, item_id: str, zone: str, revision: int) -> str:
    if zone not in ZONES:
        raise CryptoError("zone must be 'personal' or 'agent'")
    return f"{PREFIX}/item/{_uuid(user_id)}/{_uuid(item_id)}/{zone}/{_positive(revision)}"


def icon(user_id: str, item_id: str, icon_version: int) -> str:
    """The cached site icon of an agent-zone entry (docs/crypto.md §5.4). It has its own
    version, which moves when the icon is fetched again, and not the entry's revision: a
    rotation must not invalidate an icon, and an icon must not look like an entry."""
    return f"{PREFIX}/icon/{_uuid(user_id)}/{_uuid(item_id)}/{_positive(icon_version)}"


def totp(user_id: str) -> str:
    return f"{PREFIX}/totp/{_uuid(user_id)}"


def export(user_id: str, export_id: str) -> str:
    return f"{PREFIX}/export/{_uuid(user_id)}/{_uuid(export_id)}"
