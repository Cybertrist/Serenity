"""Pwned Passwords range API, k-anonymity: only the first 5 hex characters of SHA-1 leave."""

import hashlib

import httpx

API = "https://api.pwnedpasswords.com/range/"
PREFIX_LENGTH = 5


def sha1_hex(password: str) -> str:
    # SHA-1 is imposed by the Pwned Passwords API; it is not used for any protection here.
    return hashlib.sha1(password.encode("utf-8"), usedforsecurity=False).hexdigest().upper()


class PwnedPasswords:
    def __init__(self, http: httpx.Client) -> None:
        self._http = http
        self._cache: dict[str, dict[str, int]] = {}

    def range(self, prefix: str) -> dict[str, int]:
        """Suffixes seen in breaches for this prefix. Padding entries (count 0) are dropped."""
        if len(prefix) != PREFIX_LENGTH:
            raise ValueError("prefix must be 5 hex characters")
        if prefix not in self._cache:
            response = self._http.get(API + prefix, headers={"Add-Padding": "true"})
            response.raise_for_status()
            counts: dict[str, int] = {}
            for line in response.text.splitlines():
                suffix, _, count = line.strip().partition(":")
                if count.isdigit() and int(count) > 0:
                    counts[suffix.upper()] = int(count)
            self._cache[prefix] = counts
        return self._cache[prefix]

    def occurrences(self, password: str) -> int:
        digest = sha1_hex(password)
        return self.range(digest[:PREFIX_LENGTH]).get(digest[PREFIX_LENGTH:], 0)
