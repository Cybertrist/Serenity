"""AEAD blocks, type 0x01: version || type || nonce(24) || ciphertext+tag (docs/crypto.md §5.2)."""

import nacl.bindings as sodium
import nacl.exceptions
import nacl.utils

from serenity.crypto.errors import CryptoError

VERSION = 0x01
TYPE_AEAD = 0x01
TYPE_SEALED = 0x02
NONCE_BYTES = 24
TAG_BYTES = 16
HEADER = bytes([VERSION, TYPE_AEAD])
MIN_BLOCK_BYTES = len(HEADER) + NONCE_BYTES + TAG_BYTES


def _associated_data(context: str) -> bytes:
    return HEADER + context.encode("ascii")


def encrypt_block(
    key: bytes, plaintext: bytes, context: str, *, _nonce: bytes | None = None
) -> bytes:
    """Encrypt with a fresh random nonce. `_nonce` is reserved for test vectors."""
    if len(key) != 32:
        raise CryptoError("key must be 32 bytes")
    nonce = nacl.utils.random(NONCE_BYTES) if _nonce is None else _nonce
    if len(nonce) != NONCE_BYTES:
        raise CryptoError("nonce must be 24 bytes")
    ciphertext = sodium.crypto_aead_xchacha20poly1305_ietf_encrypt(
        plaintext, _associated_data(context), nonce, key
    )
    return HEADER + nonce + ciphertext


def decrypt_block(key: bytes, block: bytes, context: str) -> bytes:
    if len(key) != 32:
        raise CryptoError("key must be 32 bytes")
    if len(block) < MIN_BLOCK_BYTES:
        raise CryptoError("block too short")
    if block[0] != VERSION or block[1] != TYPE_AEAD:
        raise CryptoError("unsupported block version or type")
    nonce = block[2 : 2 + NONCE_BYTES]
    try:
        return sodium.crypto_aead_xchacha20poly1305_ietf_decrypt(
            block[2 + NONCE_BYTES :], _associated_data(context), nonce, key
        )
    except nacl.exceptions.CryptoError:
        raise CryptoError("decryption failed") from None


def wrap_key(wrapping_key: bytes, key: bytes, context: str) -> bytes:
    if len(key) != 32:
        raise CryptoError("wrapped key must be 32 bytes")
    return encrypt_block(wrapping_key, key, context)


def unwrap_key(wrapping_key: bytes, block: bytes, context: str) -> bytes:
    key = decrypt_block(wrapping_key, block, context)
    if len(key) != 32:
        raise CryptoError("unwrapped key has an invalid size")
    return key
