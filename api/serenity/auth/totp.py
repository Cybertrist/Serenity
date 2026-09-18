"""Login TOTP: seed generation, encryption at rest, verification with anti-replay."""

import time

import pyotp

from serenity.crypto.blocks import decrypt_block, encrypt_block
from serenity.crypto.contexts import totp as totp_context

ISSUER = "Serenity"


def now() -> float:
    """Current time for TOTP checks (patched in tests)."""
    return time.time()


def new_secret() -> str:
    return pyotp.random_base32()


def provisioning_uri(secret: str, username: str) -> str:
    return pyotp.TOTP(secret).provisioning_uri(name=username, issuer_name=ISSUER)


def encrypt_secret(totp_key: bytes, user_id: str, secret: str) -> bytes:
    return encrypt_block(totp_key, secret.encode("ascii"), totp_context(user_id))


def decrypt_secret(totp_key: bytes, user_id: str, block: bytes) -> str:
    return decrypt_block(totp_key, block, totp_context(user_id)).decode("ascii")


def matching_step(
    secret: str, code: str, last_step: int | None, at: float | None = None
) -> int | None:
    """Time step matched by `code`, or None. One step of drift; a used step is refused."""
    code = code.strip()
    if not (code.isdigit() and len(code) == 6):
        return None
    totp = pyotp.TOTP(secret)
    current = int((now() if at is None else at) // totp.interval)
    for step in (current - 1, current, current + 1):
        if last_step is not None and step <= last_step:
            continue
        if pyotp.utils.strings_equal(totp.generate_otp(step), code):
            return step
    return None
