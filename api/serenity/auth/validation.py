"""Input checks: usernames, KDF parameters and encrypted blocks sent by clients.

The server cannot read the blocks; it checks their format so garbage is refused early.
"""

import re
import unicodedata

from serenity.crypto import blocks, kdf, sealed
from serenity.crypto.contexts import ak_by_sk
from serenity.crypto.encoding import b64url_decode
from serenity.crypto.errors import CryptoError

# A simple name or an e-mail address (the address is only an identifier, nothing is sent to it).
_USERNAME = re.compile(r"^[a-z0-9][a-z0-9._+@-]{2,253}$")
_UUID4 = re.compile(r"^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$")
KEY_BYTES = 32
WRAPPED_KEY_BYTES = blocks.MIN_BLOCK_BYTES + KEY_BYTES


class InvalidInputError(ValueError):
    """A request field is malformed. The message is safe to return to the client."""


def normalize_username(username: str) -> str:
    value = unicodedata.normalize("NFKC", username).strip().lower()
    if not _USERNAME.match(value) or value.count("@") > 1 or value.endswith("@"):
        raise InvalidInputError(
            "identifiant : 3 à 254 caractères, lettres, chiffres et « . _ - + @ » "
            "(une adresse e-mail convient)"
        )
    return value


def user_id(value: str) -> str:
    if not _UUID4.match(value):
        raise InvalidInputError("identifiant utilisateur invalide (UUID v4 attendu)")
    return value


def raw_key(value: str, field: str) -> bytes:
    data = _decode(value, field)
    if len(data) != KEY_BYTES:
        raise InvalidInputError(f"{field} : 32 octets attendus")
    return data


def salt(value: str) -> bytes:
    data = _decode(value, "salt")
    if len(data) != kdf.SALT_BYTES:
        raise InvalidInputError("salt : 16 octets attendus")
    return data


def kdf_params(memlimit: int, opslimit: int) -> kdf.KdfParams:
    params = kdf.KdfParams(memlimit=memlimit, opslimit=opslimit)
    try:
        kdf.check_params(params)
    except CryptoError:
        raise InvalidInputError("paramètres Argon2id sous le plancher") from None
    if memlimit > 1024 * 1024 * 1024 or opslimit > 20:
        raise InvalidInputError("paramètres Argon2id trop élevés")
    return params


def wrapped_key(value: str, field: str) -> bytes:
    """An AEAD block holding a 32-byte key (docs/crypto.md §5.2)."""
    data = _decode(value, field)
    if len(data) != WRAPPED_KEY_BYTES or data[:2] != blocks.HEADER:
        raise InvalidInputError(f"{field} : bloc chiffré invalide")
    return data


def sealed_agent_key(value: str, user: str, version: int, server_key_id: bytes) -> bytes:
    """A sealed block for the current server key (docs/crypto.md §5.3)."""
    data = _decode(value, "ak_sealed")
    expected = (
        len(sealed.HEADER)
        + sealed.KEY_ID_BYTES
        + sealed.SEAL_OVERHEAD
        + KEY_BYTES
        + len(ak_by_sk(user, version))
    )
    if len(data) != expected or data[:2] != sealed.HEADER:
        raise InvalidInputError("ak_sealed : bloc scellé invalide")
    if data[2 : 2 + sealed.KEY_ID_BYTES] != server_key_id:
        raise InvalidInputError("ak_sealed : scellé pour une autre clé serveur")
    return data


def _decode(value: str, field: str) -> bytes:
    try:
        return b64url_decode(value)
    except CryptoError:
        raise InvalidInputError(f"{field} : base64url invalide") from None
