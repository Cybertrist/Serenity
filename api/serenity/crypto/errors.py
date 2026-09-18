"""Crypto errors. Messages never contain key material or plaintext."""


class CryptoError(Exception):
    """Decryption, parsing or validation failed."""
