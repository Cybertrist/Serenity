"""Site icons of the agent zone: the agent fetches them, the clients read them.

Only the agent can do this job. It is the one process that opens the agent zone (it holds the
server key) and one of the two with Internet access; the api has neither. What it stores is
encrypted with AK, so the api serves an opaque block and learns nothing (docs/crypto.md §5.8).

The personal zone is never touched here: its entries are not even selected, and AK could not
open them.

Fetching an icon means opening a URL that comes from the vault, from a container that also sits
on the private network of the rotation executor. Everything below exists for that reason: https
only, public addresses only, redirects followed by hand and re-checked, a size cap, and the type
read from the bytes rather than believed from a header.
"""

import ipaddress
import logging
import re
import socket
from dataclasses import dataclass
from datetime import datetime, timedelta
from urllib.parse import urljoin, urlsplit

import httpx
from sqlalchemy import Engine
from sqlmodel import Session, desc, select

from serenity import audit
from serenity.agent import killswitch
from serenity.agent.allowlist import host_of
from serenity.agent.watch import agent_entries, open_agent_key
from serenity.crypto import contexts
from serenity.crypto.blocks import encrypt_block
from serenity.crypto.errors import CryptoError
from serenity.models import Actor, AgentKey, ItemIcon, User, UserStatus

logger = logging.getLogger(__name__)

# Said plainly. A site that turns away a named fetcher simply keeps its icon, and the entry
# keeps its monogram: nothing here is worth pretending to be a browser for.
ICON_USER_AGENT = "Serenity (favicon fetcher)"
# What may be kept, and what may be downloaded before trimming. An ICO carries every size the
# site ever drew, stacked: La Poste ships 279 Kio that way, for a 36 px tile.
MAX_ICON_BYTES = 64 * 1024
MAX_SOURCE_BYTES = 512 * 1024
MAX_PAGE_BYTES = 256 * 1024
TIMEOUT_SECONDS = 8
MAX_REDIRECTS = 3
# The type is decided by these bytes, never by the Content-Type header. No SVG: it is XML with
# scripts in it, and it would be served from our own origin.
MAGIC: tuple[tuple[bytes, str], ...] = (
    (b"\x89PNG\r\n\x1a\n", "image/png"),
    (b"\xff\xd8\xff", "image/jpeg"),
    (b"\x00\x00\x01\x00", "image/x-icon"),
)
LINK_TAG = re.compile(rb"<link\b[^>]*>", re.IGNORECASE)
APPLE_TOUCH = re.compile(rb"apple-touch-icon", re.IGNORECASE)
SIZES = re.compile(rb'sizes\s*=\s*["\']?(\d+)', re.IGNORECASE)
REL_ICON = re.compile(rb'rel\s*=\s*["\']?[^"\'>]*\bicon\b', re.IGNORECASE)
HREF = re.compile(rb'href\s*=\s*["\']([^"\']+)["\']', re.IGNORECASE)


class IconError(Exception):
    """The site gave nothing usable. Never carries a URL: it is vault content."""


@dataclass
class IconReport:
    users: int = 0
    fetched: int = 0
    failed: int = 0
    skipped: bool = False


def sniff(data: bytes) -> str | None:
    """The image type, read from the first bytes. WebP needs two checks, not one prefix."""
    for magic, mime in MAGIC:
        if data.startswith(magic):
            return mime
    if data[:4] == b"RIFF" and data[8:12] == b"WEBP":
        return "image/webp"
    return None


def trim_ico(data: bytes) -> bytes | None:
    """Keep one image out of an ICO, the largest that fits, and rebuild a one-entry file.

    An ICO is a directory: a 6-byte header, then 16 bytes per size, then the images. Only the
    directory is read here, with its bounds checked; the image bytes are copied untouched and
    never decoded, so nothing parses hostile pixels.
    """
    if len(data) < 6 or data[:4] != b"\x00\x00\x01\x00":
        return None
    count = int.from_bytes(data[4:6], "little")
    if count < 1 or len(data) < 6 + 16 * count:
        return None
    best: tuple[int, int] | None = None  # (width, index in the directory)
    for i in range(count):
        entry = data[6 + 16 * i : 22 + 16 * i]
        width = entry[0] or 256  # 0 means 256, the format has one byte for it
        size = int.from_bytes(entry[8:12], "little")
        offset = int.from_bytes(entry[12:16], "little")
        if size == 0 or offset + size > len(data) or size + 22 > MAX_ICON_BYTES:
            continue
        if best is None or width > best[0]:
            best = (width, i)
    if best is None:
        return None
    chosen = bytearray(data[6 + 16 * best[1] : 22 + 16 * best[1]])
    size = int.from_bytes(chosen[8:12], "little")
    offset = int.from_bytes(chosen[12:16], "little")
    # The one image left starts right after a one-entry directory.
    chosen[12:16] = (22).to_bytes(4, "little")
    return (
        b"\x00\x00\x01\x00"
        + (1).to_bytes(2, "little")
        + bytes(chosen)
        + data[offset : offset + size]
    )


def is_public(host: str) -> bool:
    """Every address the name resolves to must be a public one.

    This is what keeps an entry pointing at `http://rotator:8000` or `127.0.0.1` from turning
    the agent into a probe of its own network. A name that resolves to nothing is refused too.
    """
    try:
        infos = socket.getaddrinfo(host, 443, proto=socket.IPPROTO_TCP)
    except OSError:
        return False
    addresses = {info[4][0] for info in infos}
    if not addresses:
        return False
    for address in addresses:
        try:
            ip = ipaddress.ip_address(address)
        except ValueError:
            return False
        if not ip.is_global or ip.is_multicast:
            return False
    return True


def _check(url: str) -> str:
    parts = urlsplit(url)
    if parts.scheme != "https" or not parts.hostname:
        raise IconError("not an https url")
    if not is_public(parts.hostname):
        raise IconError("host is not a public address")
    return url


def get(
    http: httpx.Client, url: str, max_bytes: int, *, truncate: bool = False
) -> tuple[bytes, str]:
    """One GET: the body and the URL it finally came from.

    Redirects are followed by hand so every hop is checked again, and the body is read in
    pieces: a site must not be able to fill the agent's memory by answering a gigabyte. An
    image that goes over the cap is refused, but a page is simply cut (`truncate`): home pages
    weigh megabytes and what we are looking for is in the head, in the first bytes.
    """
    for _ in range(MAX_REDIRECTS):
        with http.stream("GET", _check(url), follow_redirects=False) as response:
            if response.status_code in (301, 302, 303, 307, 308):
                location = response.headers.get("location")
                if not location:
                    raise IconError("redirect without a location")
                url = urljoin(url, location)
                continue
            if response.status_code != 200:
                raise IconError(f"http {response.status_code}")
            body = bytearray()
            for chunk in response.iter_bytes():
                body += chunk
                if len(body) > max_bytes:
                    if not truncate:
                        raise IconError("too large")
                    return bytes(body[:max_bytes]), str(response.url)
            return bytes(body), str(response.url)
    raise IconError("too many redirects")


def _rank(tag: bytes) -> int:
    """Which declaration is worth trying first, for a 36 px tile on a dense screen.

    An `apple-touch-icon` is a real logo, square and around 180 px: it beats everything. A
    declared icon that says it is 64 px or more comes next, then `/favicon.ico`, which is
    often a multi-size ICO, then the rest, which is usually a 16 px blur.
    """
    if APPLE_TOUCH.search(tag):
        return 3
    sizes = SIZES.search(tag)
    if sizes and int(sizes.group(1)) >= 64:
        return 2
    return 1


def _candidates(http: httpx.Client, domain: str) -> list[str]:
    """Everything worth trying for this site, best first.

    Sites that matter rarely leave their logo at `/favicon.ico` any more: La Poste keeps it in
    `/ecom/`, impots.gouv.fr in `/libraries/dsfr/`, Grindr on a CDN. All three say so in the
    head of their home page, so that is what is read first.
    """
    root = f"https://{domain}/"
    ranked: list[tuple[int, str]] = []
    try:
        page, final_url = get(http, root, MAX_PAGE_BYTES, truncate=True)
    except (IconError, httpx.HTTPError):
        page, final_url = b"", root
    for tag in LINK_TAG.findall(page):
        href = HREF.search(tag)
        if REL_ICON.search(tag) and href:
            url = urljoin(final_url, href.group(1).decode("ascii", "ignore"))
            ranked.append((_rank(tag), url))
    # `/favicon.ico` at rank 2, and the Apple convention last, for sites that declare nothing.
    ranked.append((2, urljoin(root, "/favicon.ico")))
    ranked.append((0, urljoin(root, "/apple-touch-icon.png")))
    urls: list[str] = []
    for _, url in sorted(ranked, key=lambda pair: -pair[0]):
        if url not in urls:
            urls.append(url)
    return urls


def fetch_icon(http: httpx.Client, domain: str) -> tuple[str, bytes]:
    """The icon of a site, or IconError. The type comes from the bytes, never from a header."""
    last = IconError("no candidate")
    for url in _candidates(http, domain):
        try:
            body, _ = get(http, url, MAX_SOURCE_BYTES)
            mime = sniff(body)
            if mime is None:
                raise IconError("not an image we serve")
            if mime == "image/x-icon" and len(body) > MAX_ICON_BYTES:
                trimmed = trim_ico(body)
                if trimmed is None:
                    raise IconError("icon too large and not trimmable")
                body = trimmed
            if len(body) > MAX_ICON_BYTES:
                raise IconError("too large")
            return mime, body
        except (IconError, httpx.HTTPError, UnicodeError) as exc:
            last = exc if isinstance(exc, IconError) else IconError(type(exc).__name__)
    raise last


def domain_of(entry: dict[str, object]) -> str | None:
    urls = entry.get("urls")
    if not isinstance(urls, list):
        return None
    for url in urls:
        if isinstance(url, str) and url.strip():
            host = host_of(url)
            if host:
                return host
    return None


def store(
    session: Session,
    ak: bytes,
    user_id: str,
    item_id: str,
    found: tuple[str, bytes] | None,
    now: datetime,
) -> None:
    """Write the attempt down: the encrypted icon, or the bare trace of a site that gave nothing."""
    row = session.get(ItemIcon, item_id)
    if row is None:
        row = ItemIcon(item_id=item_id, user_id=user_id, version=0)
    if found is not None:
        mime, data = found
        row.version += 1
        row.mime = mime
        row.block = encrypt_block(ak, data, contexts.icon(user_id, item_id, row.version))
    row.attempted_at = now
    session.add(row)
    session.commit()


def refresh_user(
    session: Session,
    user: User,
    server_key: bytes,
    http: httpx.Client,
    now: datetime,
    refresh_days: int,
) -> tuple[int, int]:
    key_row = session.exec(
        select(AgentKey).where(AgentKey.user_id == user.id).order_by(desc(AgentKey.version))
    ).first()
    if key_row is None:
        return 0, 0
    ak = open_agent_key(user, key_row, server_key)
    stale = now - timedelta(days=refresh_days)
    fetched = failed = 0
    for scanned in agent_entries(session, user, ak):
        # Checked before every fetch, not only once per run (CLAUDE.md rule 7).
        if killswitch.is_engaged(session):
            break
        row = session.get(ItemIcon, scanned.item_id)
        if row is not None and row.attempted_at > stale:
            continue
        domain = domain_of(scanned.entry)
        if domain is None:
            continue
        try:
            store(session, ak, user.id, scanned.item_id, fetch_icon(http, domain), now)
            fetched += 1
        except (IconError, httpx.HTTPError):
            # The reason stays out of the journal: it would name the site.
            store(session, ak, user.id, scanned.item_id, None, now)
            failed += 1
    return fetched, failed


def run_icons(
    engine: Engine, server_key: bytes, http: httpx.Client, now: datetime, refresh_days: int = 30
) -> IconReport:
    report = IconReport()
    with Session(engine) as session:
        for user in session.exec(select(User).where(User.status == UserStatus.ACTIVE)).all():
            if killswitch.is_engaged(session):
                report.skipped = True
                audit.record(
                    session,
                    Actor.AGENT,
                    "agent.icons",
                    user_id=user.id,
                    outcome="skipped",
                    details={"reason": "kill_switch"},
                )
                break
            try:
                fetched, failed = refresh_user(session, user, server_key, http, now, refresh_days)
            except CryptoError as exc:
                session.rollback()
                logger.warning("icons failed for a user: %s", type(exc).__name__)
                audit.record(
                    session,
                    Actor.AGENT,
                    "agent.icons",
                    user_id=user.id,
                    outcome="failure",
                    details={"error": type(exc).__name__},
                )
                continue
            report.users += 1
            report.fetched += fetched
            report.failed += failed
            if fetched or failed:
                # Counts only: a domain has no business in the journal (CLAUDE.md rule 1).
                audit.record(
                    session,
                    Actor.AGENT,
                    "agent.icons",
                    user_id=user.id,
                    details={"fetched": fetched, "failed": failed},
                )
    return report
