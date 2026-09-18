"""Binary encodings: base64url without padding (docs/crypto.md §5.1)."""

import base64
import binascii

from serenity.crypto.errors import CryptoError


def b64url_encode(data: bytes) -> str:
    return base64.urlsafe_b64encode(data).rstrip(b"=").decode("ascii")


def b64url_decode(text: str) -> bytes:
    if "=" in text:
        raise CryptoError("padding is not allowed")
    try:
        return base64.urlsafe_b64decode(text + "=" * (-len(text) % 4))
    except (binascii.Error, ValueError):
        raise CryptoError("invalid base64url") from None
