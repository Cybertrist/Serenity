"""Vault errors, with messages safe to return to clients (in French)."""

from serenity.models import Item


class VaultError(Exception):
    """Base class."""


class NotFoundError(VaultError):
    pass


class ConflictError(VaultError):
    """The client based its change on an outdated revision: it must merge and retry."""

    def __init__(self, message: str, current: Item) -> None:
        super().__init__(message)
        self.current = current


class InvalidRequestError(VaultError):
    pass
