"""Origin check on every state-changing request: defence in depth against cross-site requests.

The session cookie is already `SameSite=Strict`; this adds a second, independent lock. A
browser always sends `Origin` on a POST, PUT, PATCH or DELETE: if it is there, it must be the
public URL of this Serenity. No `Origin` at all (a script, the test client, `make client`) is
not a browser acting for someone else, and stays accepted.
"""

from urllib.parse import urlsplit

from starlette.responses import JSONResponse
from starlette.types import ASGIApp, Receive, Scope, Send

UNSAFE_METHODS = frozenset({"POST", "PUT", "PATCH", "DELETE"})
DEFAULT_PORTS = {"http": 80, "https": 443}


def origin_of(url: str) -> str:
    """`scheme://host[:port]`, lower case, default port left out: the form browsers send."""
    parts = urlsplit(url.strip())
    try:
        port = parts.port
    except ValueError:  # "https://host:abc": matches nothing, and must not crash the check
        return url.strip().lower()
    scheme = parts.scheme.lower()
    host = (parts.hostname or "").lower()
    if port is not None and port != DEFAULT_PORTS.get(scheme):
        host = f"{host}:{port}"
    return f"{scheme}://{host}"


class OriginCheck:
    """Pure ASGI middleware: nothing is buffered, the event stream passes through untouched."""

    def __init__(self, app: ASGIApp, public_url: str) -> None:
        self.app = app
        self.allowed = origin_of(public_url)

    async def __call__(self, scope: Scope, receive: Receive, send: Send) -> None:
        if scope["type"] == "http" and scope["method"] in UNSAFE_METHODS:
            origin = next((v for k, v in scope["headers"] if k == b"origin"), None)
            if origin is not None and origin_of(origin.decode("latin-1")) != self.allowed:
                response = JSONResponse(
                    {"detail": "Requête refusée : elle ne vient pas de Serenity."}, status_code=403
                )
                await response(scope, receive, send)
                return
        await self.app(scope, receive, send)
