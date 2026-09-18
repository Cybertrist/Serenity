"""Have I Been Pwned breached-account API (paid key), for watched e-mail addresses."""

from dataclasses import dataclass
from urllib.parse import quote

import httpx

API = "https://haveibeenpwned.com/api/v3/breachedaccount/"
USER_AGENT = "Serenity-password-manager"


@dataclass(frozen=True)
class AccountBreach:
    name: str
    date: str | None


class Hibp:
    def __init__(self, http: httpx.Client, api_key: str) -> None:
        self._http = http
        self._api_key = api_key

    def breaches(self, email: str) -> list[AccountBreach]:
        response = self._http.get(
            API + quote(email, safe=""),
            params={"truncateResponse": "false", "includeUnverified": "false"},
            headers={"hibp-api-key": self._api_key, "user-agent": USER_AGENT},
        )
        if response.status_code == 404:
            return []
        response.raise_for_status()
        return [AccountBreach(b["Name"], b.get("BreachDate")) for b in response.json()]
