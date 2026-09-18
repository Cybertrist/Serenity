"""Sealed blocks, type 0x02: AK sealed for the server's X25519 key (docs/crypto.md §5.3)."""

import hmac

import nacl.bindings as sodium
import nacl.exceptions

from serenity.crypto.blocks import TYPE_SEALED, VERSION
from serenity.crypto.errors import CryptoError
from serenity.crypto.kdf import CTX_SEAL, derive_subkey

HEADER = bytes([VERSION, TYPE_SEALED])
KEY_ID_BYTES = 4
SEAL_OVERHEAD = 48
KEY_BYTES = 32


def server_keypair(seed: bytes) -> tuple[bytes, bytes]:
    """(public, secret) X25519 keys derived from the 32-byte server key file."""
    if len(seed) != 32:
        raise CryptoError("server key must be 32 bytes")
    return sodium.crypto_box_seed_keypair(derive_subkey(seed, 1, CTX_SEAL))


def key_id(public_key: bytes) -> bytes:
    return sodium.crypto_generichash_blake2b_salt_personal(public_key, digest_size=32)[
        :KEY_ID_BYTES
    ]


def seal_for_server(public_key: bytes, key: bytes, context: str) -> bytes:
    if len(key) != KEY_BYTES:
        raise CryptoError("sealed key must be 32 bytes")
    sealed = sodium.crypto_box_seal(key + context.encode("ascii"), public_key)
    return HEADER + key_id(public_key) + sealed


def open_sealed(public_key: bytes, secret_key: bytes, block: bytes, context: str) -> bytes:
    """Open a sealed key and check the context bound inside the message."""
    prefix = len(HEADER) + KEY_ID_BYTES
    if len(block) < prefix + SEAL_OVERHEAD + KEY_BYTES:
        raise CryptoError("sealed block too short")
    if block[:2] != HEADER:
        raise CryptoError("unsupported block version or type")
    if not hmac.compare_digest(block[2:prefix], key_id(public_key)):
        raise CryptoError("sealed for another server key")
    try:
        message = sodium.crypto_box_seal_open(block[prefix:], public_key, secret_key)
    except nacl.exceptions.CryptoError:
        raise CryptoError("decryption failed") from None
    if not hmac.compare_digest(message[KEY_BYTES:], context.encode("ascii")):
        raise CryptoError("context mismatch")
    return message[:KEY_BYTES]
