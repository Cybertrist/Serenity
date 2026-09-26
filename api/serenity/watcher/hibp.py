"""Have I Been Pwned breached-account API (paid key), for watched e-mail addresses.

The API is rate limited per key (10 requests a minute on the smallest plan): calls are spaced,
and a 429 is honoured with its Retry-After instead of failing the whole watch.
"""

import time
from collections.abc import Callable
from dataclasses import dataclass
from urllib.parse import quote

import httpx

API = "https://haveibeenpwned.com/api/v3/breachedaccount/"
USER_AGENT = "Serenity-password-manager"
# 10 requests a minute, with a little margin.
MIN_INTERVAL_SECONDS = 6.5
# A 429 is retried this many times, never waiting longer than MAX_RETRY_AFTER each time.
RETRIES = 2
MAX_RETRY_AFTER = 60.0


@dataclass(frozen=True)
class AccountBreach:
    name: str
    date: str | None


def retry_after(response: httpx.Response) -> float:
    """Seconds the API asks us to wait, bounded: a broken header must not stall the agent."""
    try:
        seconds = float(response.headers.get("retry-after", "2"))
    except ValueError:
        seconds = 2.0
    return min(max(seconds, 1.0), MAX_RETRY_AFTER)


class Hibp:
    def __init__(
        self,
        http: httpx.Client,
        api_key: str,
        *,
        min_interval: float = MIN_INTERVAL_SECONDS,
        sleep: Callable[[float], None] = time.sleep,
        clock: Callable[[], float] = time.monotonic,
    ) -> None:
        self._http = http
        self._api_key = api_key
        self._min_interval = min_interval
        self._sleep = sleep
        self._clock = clock
        self._last_call: float | None = None

    def _get(self, email: str) -> httpx.Response:
        if self._last_call is not None:
            wait = self._last_call + self._min_interval - self._clock()
            if wait > 0:
                self._sleep(wait)
        try:
            return self._http.get(
                API + quote(email, safe=""),
                params={"truncateResponse": "false", "includeUnverified": "false"},
                headers={"hibp-api-key": self._api_key, "user-agent": USER_AGENT},
            )
        finally:
            self._last_call = self._clock()

    def breaches(self, email: str) -> list[AccountBreach]:
        response = self._get(email)
        for _ in range(RETRIES):
            if response.status_code != 429:
                break
            self._sleep(retry_after(response))
            response = self._get(email)
        if response.status_code == 404:
            return []
        response.raise_for_status()
        return [AccountBreach(b["Name"], b.get("BreachDate")) for b in response.json()]
