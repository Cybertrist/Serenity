"""Allowlist of sites the agent may rotate (CLAUDE.md rule 5: checked by code, never by an LLM).

`allowlist.yaml` uses a strict subset of YAML (no YAML library in the stack):

    domains:
      - netflix.com
      - spotify.com

or `domains: []`. Anything else is refused, so a typo can never widen the list.
"""

import re
from pathlib import Path
from urllib.parse import urlsplit

_DOMAIN = re.compile(r"^(?=.{1,253}$)([a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,63}$")


class AllowlistError(ValueError):
    pass


def parse_allowlist(text: str) -> frozenset[str]:
    domains: list[str] = []
    seen_key = False
    for number, raw in enumerate(text.splitlines(), start=1):
        line = raw.split("#", 1)[0].rstrip()
        if not line.strip():
            continue
        if line == "domains: []" and not seen_key:
            seen_key = True
            continue
        if line == "domains:" and not seen_key:
            seen_key = True
            continue
        match = re.fullmatch(r"\s+-\s+(\S+)", line)
        if seen_key and match:
            domain = match.group(1).lower().rstrip(".")
            if not _DOMAIN.match(domain):
                raise AllowlistError(f"line {number}: invalid domain")
            domains.append(domain)
            continue
        raise AllowlistError(f"line {number}: unexpected content")
    if not seen_key:
        raise AllowlistError("missing 'domains:' key")
    return frozenset(domains)


def load_allowlist(path: Path) -> frozenset[str]:
    return parse_allowlist(path.read_text(encoding="utf-8"))


def host_of(url: str) -> str | None:
    host = urlsplit(url if "://" in url else f"https://{url}").hostname
    return host.lower().rstrip(".") if host else None


def is_allowed(urls: list[str], allowlist: frozenset[str]) -> bool:
    """Every URL of the entry must be on an allowlisted domain (or one of its subdomains)."""
    hosts = [host_of(u) for u in urls if u.strip()]
    if not hosts or any(h is None for h in hosts):
        return False
    return all(any(h == d or h.endswith("." + d) for d in allowlist) for h in hosts if h)
