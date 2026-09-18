"""Server key file: 32 random bytes kept out of the database (docs/crypto.md §3).

Generation, ownership (root:root 0400) and mounting are handled by the infrastructure (phase 2).
"""

from pathlib import Path

from serenity.crypto.errors import CryptoError
from serenity.crypto.sealed import key_id, server_keypair

SERVER_KEY_BYTES = 32


def load_server_key(path: Path) -> bytes:
    data = path.read_bytes()
    if len(data) != SERVER_KEY_BYTES:
        raise CryptoError("server key file must contain exactly 32 bytes")
    return data


def server_public_key(seed: bytes) -> tuple[bytes, bytes]:
    """(public key, key id) published to clients so they can seal AK."""
    public, _secret = server_keypair(seed)
    return public, key_id(public)
