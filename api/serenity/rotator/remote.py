"""SiteRotator that delegates the browser to the rotator container (ADR-015).

The agent keeps every decision and the transaction; this only carries three verbs over an
internal network. It is the single place where a decrypted password leaves the agent process,
and it leaves it towards one host, on a network with no route to the outside.
"""

import logging
from dataclasses import dataclass, field
from typing import Any

import httpx
import pyotp

from serenity.rotator.base import Credentials, RotationError

logger = logging.getLogger(__name__)

# A rotation is a browser driving two forms: slow by nature, but never endless.
TIMEOUT = httpx.Timeout(90.0, connect=5.0)


def totp_code(uri_or_secret: str, now: int | None = None) -> str | None:
    """A site may ask for a code; the entry may carry one (docs/crypto.md §5.7)."""
    value = uri_or_secret.strip()
    if not value:
        return None
    try:
        parsed = pyotp.parse_uri(value) if value.startswith("otpauth://") else pyotp.TOTP(value)
        if not isinstance(parsed, pyotp.TOTP):  # an otpauth:// URI can carry a counter-based OTP
            return None
        code = parsed.now() if now is None else parsed.at(now)
    except Exception:  # a malformed secret is the entry's problem, not a crash
        return None
    return code


@dataclass
class RemoteSiteRotator:
    """Implements the SiteRotator protocol of `rotator.base` over HTTP."""

    base_url: str
    """Where the rotator container listens (never published outside the host)."""
    token: str
    recipe: str
    site_url: str
    """The entry's URL: gives the scheme and host the browser will open."""
    domains: frozenset[str]
    totp_uri: str = ""
    client: httpx.Client | None = None
    history: list[str] = field(default_factory=list)

    def _post(self, path: str, payload: dict[str, Any]) -> bool:
        body = {
            "recipe": self.recipe,
            "base_url": self.site_url,
            **payload,
        }
        code = totp_code(self.totp_uri)
        if code:
            body["totp"] = code
        client = self.client or httpx.Client(timeout=TIMEOUT)
        try:
            response = client.post(
                f"{self.base_url.rstrip('/')}{path}",
                json=body,
                headers={"authorization": f"Bearer {self.token}"},
            )
        except httpx.HTTPError as exc:
            raise RotationError(f"rotateur injoignable ({type(exc).__name__})") from None
        finally:
            if self.client is None:
                client.close()
        if response.status_code != 200:
            raise RotationError(f"rotateur: réponse {response.status_code}")
        data = response.json()
        self.history.append(path)
        if not data.get("ok"):
            raise RotationError(str(data.get("error") or "échec sur le site"))
        return True

    # --- SiteRotator -------------------------------------------------------------------

    def login(self, credentials: Credentials) -> None:
        """Prove the current password before anything is changed."""
        self._post("/verify", {"username": credentials.username, "password": credentials.password})

    def change_password(self, current: Credentials, new_password: str) -> None:
        self._post(
            "/change",
            {
                "username": current.username,
                "password": current.password,
                "new_password": new_password,
            },
        )

    def verify(self, credentials: Credentials) -> bool:
        """A fresh login from scratch: the only thing that proves the site really changed."""
        try:
            return self._post(
                "/verify", {"username": credentials.username, "password": credentials.password}
            )
        except RotationError:
            return False
