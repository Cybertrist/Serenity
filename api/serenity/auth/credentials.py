"""Single-user credentials: argon2 password hash and TOTP seed, stored in a 0600 file."""

import json
import os
from dataclasses import dataclass
from pathlib import Path

import pyotp
from argon2 import PasswordHasher
from argon2.exceptions import InvalidHashError, VerificationError

MIN_PASSWORD_LENGTH = 12
_hasher = PasswordHasher()


@dataclass(frozen=True)
class Credentials:
    password_hash: str
    totp_secret: str

    def __repr__(self) -> str:
        return "Credentials(<hidden>)"


def create_credentials(password: str, totp_secret: str) -> Credentials:
    if len(password) < MIN_PASSWORD_LENGTH:
        raise ValueError(f"password must be at least {MIN_PASSWORD_LENGTH} characters")
    return Credentials(password_hash=_hasher.hash(password), totp_secret=totp_secret)


def new_totp_secret() -> str:
    return pyotp.random_base32()


def provisioning_uri(totp_secret: str, account: str = "tristan") -> str:
    return pyotp.TOTP(totp_secret).provisioning_uri(name=account, issuer_name="Serenity")


def save_credentials(path: Path, credentials: Credentials) -> None:
    """Write atomically, readable by the current user only."""
    tmp = path.with_suffix(".tmp")
    fd = os.open(tmp, os.O_WRONLY | os.O_CREAT | os.O_TRUNC, 0o600)
    with os.fdopen(fd, "w") as f:
        json.dump(
            {"password_hash": credentials.password_hash, "totp_secret": credentials.totp_secret},
            f,
        )
    os.replace(tmp, path)


def load_credentials(path: Path) -> Credentials | None:
    if not path.exists():
        return None
    data = json.loads(path.read_text())
    return Credentials(password_hash=data["password_hash"], totp_secret=data["totp_secret"])


def verify_password(credentials: Credentials, password: str) -> bool:
    try:
        return _hasher.verify(credentials.password_hash, password)
    except (VerificationError, InvalidHashError):
        return False


def totp_step(credentials: Credentials, code: str, last_step: int | None, at: float) -> int | None:
    """Return the matched TOTP time step, or None if the code is invalid or already used.

    One step of clock drift is tolerated. A step already used (`last_step`) is refused
    so a code seen over the shoulder cannot be replayed.
    """
    code = code.strip()
    if not (code.isdigit() and len(code) == 6):
        return None
    totp = pyotp.TOTP(credentials.totp_secret)
    current = int(at // totp.interval)
    for step in (current - 1, current, current + 1):
        if last_step is not None and step <= last_step:
            continue
        if pyotp.utils.strings_equal(totp.generate_otp(step), code):
            return step
    return None
