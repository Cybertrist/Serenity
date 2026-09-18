"""Argon2id hashing of AuthKey and RAK (libsodium crypto_pwhash_str)."""

import nacl.exceptions
import nacl.pwhash

from serenity.config import Settings


def hash_key(settings: Settings, key: bytes) -> str:
    digest: bytes = nacl.pwhash.argon2id.str(
        key, opslimit=settings.auth_hash_opslimit, memlimit=settings.auth_hash_memlimit
    )
    return digest.decode("ascii")


def verify_key(stored: str, key: bytes) -> bool:
    try:
        return bool(nacl.pwhash.argon2id.verify(stored.encode("ascii"), key))
    except (nacl.exceptions.InvalidkeyError, nacl.exceptions.CryptoError, ValueError):
        return False


class DummyHash:
    """Hash checked for unknown accounts, so response time does not reveal which exist."""

    def __init__(self, settings: Settings) -> None:
        self._stored = hash_key(settings, b"\x00" * 32)

    def burn(self, key: bytes) -> None:
        verify_key(self._stored, key)
