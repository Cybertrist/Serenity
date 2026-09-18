"""Authentication outcomes returned to routes (messages safe for clients, in French)."""

from datetime import datetime
from enum import StrEnum


class AuthErrorKind(StrEnum):
    INVALID = "invalid"
    LOCKED = "locked"
    CLOSED = "closed"
    UNAVAILABLE = "unavailable"
    NOT_FOUND = "not_found"


class AuthError(Exception):
    def __init__(self, kind: AuthErrorKind, message: str, retry_after: datetime | None = None):
        super().__init__(message)
        self.kind = kind
        self.retry_after = retry_after
