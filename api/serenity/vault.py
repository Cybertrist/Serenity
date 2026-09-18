"""Client for the Bitwarden CLI `bw serve` API: list, read, update, sync.

Passwords are only ever held as `SecretStr` and are never logged or returned by the API.
"""

import re
from datetime import datetime
from typing import Any
from urllib.parse import urlsplit

import httpx
from pydantic import BaseModel, SecretStr

LOGIN_ITEM_TYPE = 1
_ITEM_ID = re.compile(r"^[0-9a-fA-F-]{36}$")


class VaultError(RuntimeError):
    """A `bw serve` call failed. The message never contains a secret."""


class VaultItem(BaseModel):
    """A login item of the vault."""

    id: str
    name: str
    organization_id: str | None = None
    collection_ids: list[str] = []
    uris: list[str] = []
    username: str | None = None
    password: SecretStr | None = None
    password_revision_date: datetime | None = None
    creation_date: datetime | None = None
    revision_date: datetime | None = None

    @property
    def domain(self) -> str | None:
        for uri in self.uris:
            host = urlsplit(uri if "://" in uri else f"https://{uri}").hostname
            if host:
                return host.lower()
        return None

    @property
    def password_changed_at(self) -> datetime | None:
        # Bitwarden only sets passwordRevisionDate once the password has been changed.
        return self.password_revision_date or self.creation_date


def parse_item(raw: dict[str, Any]) -> VaultItem:
    login = raw.get("login") or {}
    return VaultItem(
        id=raw["id"],
        name=raw.get("name") or "",
        organization_id=raw.get("organizationId"),
        collection_ids=raw.get("collectionIds") or [],
        uris=[u["uri"] for u in login.get("uris") or [] if u.get("uri")],
        username=login.get("username"),
        password=SecretStr(login["password"]) if login.get("password") else None,
        password_revision_date=login.get("passwordRevisionDate"),
        creation_date=raw.get("creationDate"),
        revision_date=raw.get("revisionDate"),
    )


class Vault:
    def __init__(self, client: httpx.Client) -> None:
        self._client = client

    def _call(self, method: str, path: str, json: Any = None) -> Any:
        try:
            response = self._client.request(method, path, json=json)
        except httpx.HTTPError as exc:
            raise VaultError(f"bw serve {method} {path}: {type(exc).__name__}") from None
        try:
            body = response.json()
        except ValueError:
            body = {}
        if response.status_code >= 400 or not body.get("success", False):
            # bw error messages describe the failure, never the item content.
            message = str(body.get("message") or "")[:200]
            raise VaultError(f"bw serve {method} {path}: HTTP {response.status_code} {message}")
        return body.get("data")

    def status(self) -> str:
        """unauthenticated, locked or unlocked."""
        data = self._call("GET", "/status")
        return str(data["template"]["status"])

    def sync(self) -> None:
        """Pull the latest vault content from Vaultwarden."""
        self._call("POST", "/sync")

    def list_items(self) -> list[VaultItem]:
        data = self._call("GET", "/list/object/items")
        return [parse_item(raw) for raw in data["data"] if raw.get("type") == LOGIN_ITEM_TYPE]

    def get_item(self, item_id: str) -> VaultItem:
        _check_id(item_id)
        return parse_item(self._call("GET", f"/object/item/{item_id}"))

    def set_password(self, item_id: str, password: SecretStr) -> VaultItem:
        """Replace the password of a login item, keeping every other field untouched."""
        _check_id(item_id)
        raw = self._call("GET", f"/object/item/{item_id}")
        if raw.get("type") != LOGIN_ITEM_TYPE:
            raise VaultError(f"item {item_id} is not a login")
        raw["login"]["password"] = password.get_secret_value()
        return parse_item(self._call("PUT", f"/object/item/{item_id}", json=raw))


def _check_id(item_id: str) -> None:
    if not _ITEM_ID.match(item_id):
        raise VaultError("invalid item id")
