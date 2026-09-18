"""Recovery kit: 160-bit key shown as Crockford base32 with a check group (docs/crypto.md §5.6)."""

import re

import nacl.bindings as sodium

from serenity.crypto.errors import CryptoError
from serenity.crypto.kdf import (
    CTX_RECOVERY_AUTH,
    CTX_RECOVERY_CHECK,
    CTX_RECOVERY_WRAP,
    derive_subkey,
)

RK_BYTES = 20
ALPHABET = "0123456789ABCDEFGHJKMNPQRSTVWXYZ"
DATA_CHARS = 32
CHECK_CHARS = 4
_ALIASES = str.maketrans({"I": "1", "L": "1", "O": "0"})
_IGNORED = re.compile(r"[\s-]")


def _encode_bits(data: bytes, nbits: int) -> str:
    value = int.from_bytes(data, "big") >> (len(data) * 8 - nbits)
    return "".join(ALPHABET[(value >> shift) & 31] for shift in range(nbits - 5, -1, -5))


def _stretch(rk: bytes) -> bytes:
    if len(rk) != RK_BYTES:
        raise CryptoError("recovery key must be 20 bytes")
    return sodium.crypto_generichash_blake2b_salt_personal(rk, digest_size=32)


def _check_group(rk: bytes) -> str:
    return _encode_bits(derive_subkey(_stretch(rk), 1, CTX_RECOVERY_CHECK)[:3], 20)


def derive_recovery_keys(rk: bytes) -> tuple[bytes, bytes]:
    """(RAK, RWK): recovery auth key (sent) and recovery wrapping key (kept)."""
    rks = _stretch(rk)
    return derive_subkey(rks, 1, CTX_RECOVERY_AUTH), derive_subkey(rks, 1, CTX_RECOVERY_WRAP)


def encode_recovery_key(rk: bytes) -> str:
    text = _encode_bits(rk, RK_BYTES * 8) + _check_group(rk)
    return "-".join(text[i : i + 4] for i in range(0, len(text), 4))


def decode_recovery_key(text: str) -> bytes:
    """Parse a typed recovery key. Case, dashes and spaces are ignored; I/L read 1, O reads 0."""
    cleaned = _IGNORED.sub("", text).upper().translate(_ALIASES)
    if len(cleaned) != DATA_CHARS + CHECK_CHARS or any(c not in ALPHABET for c in cleaned):
        raise CryptoError("recovery key must be 36 base32 characters")
    value = 0
    for char in cleaned[:DATA_CHARS]:
        value = (value << 5) | ALPHABET.index(char)
    rk = value.to_bytes(RK_BYTES, "big")
    if cleaned[DATA_CHARS:] != _check_group(rk):
        raise CryptoError("recovery key check group does not match (typo?)")
    return rk
