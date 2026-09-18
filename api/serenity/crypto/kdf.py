"""Master password derivation (Argon2id) and subkeys (crypto_kdf), docs/crypto.md §4 and §5.5."""

import unicodedata
from dataclasses import dataclass

import nacl.bindings as sodium
import nacl.pwhash

from serenity.crypto.errors import CryptoError

KEY_BYTES = 32
SALT_BYTES = 16
MIN_PASSWORD_CHARS = 12
MAX_PASSWORD_BYTES = 1024
KDF_CONTEXT_BYTES = 8

# Subkey contexts (exactly 8 ASCII characters).
CTX_AUTH = "srn-auth"
CTX_WRAP = "srn-wrap"
CTX_RECOVERY_AUTH = "srn-rcva"
CTX_RECOVERY_WRAP = "srn-rcvw"
CTX_RECOVERY_CHECK = "srn-rcvc"
CTX_SEAL = "srn-seal"
CTX_EXPORT = "srn-expt"


@dataclass(frozen=True)
class KdfParams:
    """Argon2id cost. Values below the floor are always refused."""

    memlimit: int = 64 * 1024 * 1024
    opslimit: int = 3


DEFAULT_PARAMS = KdfParams()
FLOOR = KdfParams()


def check_params(params: KdfParams) -> None:
    if params.memlimit < FLOOR.memlimit or params.opslimit < FLOOR.opslimit:
        raise CryptoError("Argon2id parameters below the floor")


def normalize_password(password: str) -> bytes:
    normalized = unicodedata.normalize("NFKC", password)
    if len(normalized) < MIN_PASSWORD_CHARS:
        raise CryptoError(f"master password must have at least {MIN_PASSWORD_CHARS} characters")
    data = normalized.encode("utf-8")
    if len(data) > MAX_PASSWORD_BYTES:
        raise CryptoError(f"master password must be at most {MAX_PASSWORD_BYTES} bytes")
    return data


def derive_master_key(password: str, salt: bytes, params: KdfParams = DEFAULT_PARAMS) -> bytes:
    """MK = Argon2id(NFKC(password), salt). Never stored, never sent."""
    check_params(params)
    if len(salt) != SALT_BYTES:
        raise CryptoError("salt must be 16 bytes")
    return nacl.pwhash.argon2id.kdf(
        KEY_BYTES,
        normalize_password(password),
        salt,
        opslimit=params.opslimit,
        memlimit=params.memlimit,
    )


def derive_subkey(key: bytes, subkey_id: int, context: str) -> bytes:
    """crypto_kdf_derive_from_key(32, subkey_id, context, key).

    PyNaCl does not expose crypto_kdf; this is libsodium's own construction
    (BLAKE2b, salt = LE64(id) || 0^8, personal = context || 0^8), checked by the vectors.
    """
    ctx = context.encode("ascii")
    if len(ctx) != KDF_CONTEXT_BYTES:
        raise CryptoError("KDF context must be exactly 8 bytes")
    if len(key) != KEY_BYTES:
        raise CryptoError("KDF key must be 32 bytes")
    if not 0 <= subkey_id < 2**64:
        raise CryptoError("invalid subkey id")
    return sodium.crypto_generichash_blake2b_salt_personal(
        b"",
        digest_size=KEY_BYTES,
        key=key,
        salt=subkey_id.to_bytes(8, "little") + bytes(8),
        person=ctx + bytes(8),
    )


def derive_login_keys(master_key: bytes) -> tuple[bytes, bytes]:
    """(AuthKey, MEK) from MK."""
    return derive_subkey(master_key, 1, CTX_AUTH), derive_subkey(master_key, 1, CTX_WRAP)
