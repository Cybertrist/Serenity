"""Format checks of item blocks (the server cannot decrypt them, it checks their shape)."""

from serenity.crypto import blocks, items
from serenity.crypto.encoding import b64url_decode
from serenity.crypto.errors import CryptoError
from serenity.vault.errors import InvalidRequestError

# Generous upper bound for one entry (notes included), once padded and encrypted.
MAX_BLOCK_BYTES = 256 * 1024


def item_block(value: str) -> bytes:
    """An AEAD block whose plaintext is padded to a multiple of 256 bytes (docs/crypto.md §5.7)."""
    try:
        data = b64url_decode(value)
    except CryptoError:
        raise InvalidRequestError("bloc : base64url invalide") from None
    padded = len(data) - blocks.MIN_BLOCK_BYTES
    if (
        data[:2] != blocks.HEADER
        or len(data) > MAX_BLOCK_BYTES
        or padded < items.PAD_BLOCK
        or padded % items.PAD_BLOCK
    ):
        raise InvalidRequestError("bloc : format d'entrée chiffrée invalide")
    return data
