"""Vault entries: JSON, padded to 256 bytes, then AEAD (docs/crypto.md §5.7)."""

import json
from typing import Any

import nacl.bindings as sodium
import nacl.exceptions

from serenity.crypto.blocks import decrypt_block, encrypt_block
from serenity.crypto.errors import CryptoError

PAD_BLOCK = 256
ITEM_VERSION = 1
ITEM_TYPES = ("login", "note")
MAX_NAME_CHARS = 200


def validate_entry(entry: Any) -> dict[str, Any]:
    """Check the fields every reader relies on. Unknown fields are kept untouched."""
    if not isinstance(entry, dict):
        raise CryptoError("entry must be a JSON object")
    version = entry.get("v")
    if isinstance(version, bool) or not isinstance(version, int) or version < 1:
        raise CryptoError("entry version missing")
    if version > ITEM_VERSION:
        raise CryptoError("entry version not supported by this client")
    if entry.get("type") not in ITEM_TYPES:
        raise CryptoError("unknown entry type")
    name = entry.get("name")
    if not isinstance(name, str) or not 1 <= len(name) <= MAX_NAME_CHARS:
        raise CryptoError("entry name must have 1 to 200 characters")
    return entry


def pad(data: bytes) -> bytes:
    return sodium.sodium_pad(data, PAD_BLOCK)


def unpad(data: bytes) -> bytes:
    try:
        return sodium.sodium_unpad(data, PAD_BLOCK)
    except (nacl.exceptions.CryptoError, ValueError):
        raise CryptoError("invalid padding") from None


def encrypt_item(
    key: bytes, entry: dict[str, Any], context: str, *, _nonce: bytes | None = None
) -> bytes:
    data = json.dumps(validate_entry(entry), ensure_ascii=False, separators=(",", ":"))
    return encrypt_block(key, pad(data.encode("utf-8")), context, _nonce=_nonce)


def decrypt_item(key: bytes, block: bytes, context: str) -> dict[str, Any]:
    data = unpad(decrypt_block(key, block, context))
    try:
        entry = json.loads(data.decode("utf-8"))
    except (UnicodeDecodeError, json.JSONDecodeError):
        raise CryptoError("entry is not valid JSON") from None
    return validate_entry(entry)
