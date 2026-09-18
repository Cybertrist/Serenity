"""Cryptography of the dual-zone vault. Normative spec: docs/crypto.md.

Every primitive comes from libsodium (PyNaCl). Any change here requires updating
docs/crypto.md and the shared test vectors, after explicit approval.
"""

from serenity.crypto.errors import CryptoError

__all__ = ["CryptoError"]
