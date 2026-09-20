"""Every route declares its access level, and the exceptions are listed here by name.

This is the access-control matrix of the API, pinned. Adding a route without `require_session`
or `require_unlocked` fails this file, and so does making a new route public: the reviewer has
to come here and say why in writing.
"""

import tempfile
from pathlib import Path

from fastapi import FastAPI
from fastapi.routing import APIRoute

from serenity.config import Settings
from serenity.main import create_app

# Reachable without any session. Each line says why it has to be.
PUBLIC = {
    ("GET", "/api/health"): "liveness probe, says nothing about the vault",
    ("GET", "/api/crypto/server-key"): "the agent's PUBLIC key, needed to seal the agent key",
    ("GET", "/api/auth/status"): "says whether signup is open, so the app picks a screen",
    ("POST", "/api/auth/prelogin"): "KDF parameters and salt, needed before deriving anything",
    ("POST", "/api/auth/signup"): "creating the one account; closes itself afterwards",
    ("POST", "/api/auth/signup/confirm"): "second step of the same signup",
    ("POST", "/api/auth/login"): "the login itself",
    ("POST", "/api/auth/recover/start"): "recovery kit, when the master password is lost",
    ("POST", "/api/auth/recover/complete"): "second step of the same recovery",
}

# Mutations that a locked device may still do. Everything else that writes needs the master
# password within the unlock window.
LOCKED_WRITES = {
    ("POST", "/api/auth/lock"): "locking must always be possible",
    ("POST", "/api/auth/logout"): "so must leaving",
    ("POST", "/api/auth/unlock"): "this is the unlock itself",
    # Releasing it does ask for the master password, inside the route (docs/06-agent.md).
    ("POST", "/api/agent/kill-switch"): "stopping the agent must work on a locked vault",
    ("POST", "/api/notifications/read-all"): "marking a notification read reveals nothing",
    ("POST", "/api/notifications/{notification_id}/read"): "same",
}


def guards(route: APIRoute) -> set[str]:
    found: set[str] = set()

    def walk(dependant: object) -> None:
        for sub in dependant.dependencies:  # type: ignore[attr-defined]
            call = getattr(sub, "call", None)
            if call is not None:
                found.add(call.__name__)
            walk(sub)

    walk(route.dependant)
    return found


def routes(app: FastAPI) -> list[tuple[str, str, set[str]]]:
    out: list[tuple[str, str, set[str]]] = []

    def walk(items: object) -> None:
        for route in items:  # type: ignore[attr-defined]
            if isinstance(route, APIRoute):
                for method in sorted(route.methods - {"HEAD", "OPTIONS"}):
                    out.append((method, route.path, guards(route)))
                continue
            # FastAPI wraps an included router; the routes hang off the original one.
            sub = getattr(route, "original_router", None) or (
                route if hasattr(route, "routes") else None
            )
            if sub is not None:
                walk(sub.routes)

    walk(app.routes)
    return out


def build() -> FastAPI:
    tmp = Path(tempfile.mkdtemp())
    return create_app(Settings(secret_key="route-guards-" + "k" * 35, db_path=tmp / "s.sqlite"))


def test_no_route_is_public_by_accident() -> None:
    open_routes = {
        (method, path)
        for method, path, found in routes(build())
        if not found & {"require_session", "require_unlocked"}
    }
    assert open_routes == set(PUBLIC), (
        "A route lost its guard, or a new public route appeared. "
        "Add it to PUBLIC with the reason, or give it a session."
    )


def test_writing_needs_an_unlocked_vault() -> None:
    writes = {
        (method, path)
        for method, path, found in routes(build())
        if method in {"POST", "PUT", "DELETE", "PATCH"}
        and "require_unlocked" not in found
        and (method, path) not in PUBLIC
    }
    assert writes == set(LOCKED_WRITES), (
        "A route writes without the master password. Add it to LOCKED_WRITES with the reason, "
        "or ask for require_unlocked."
    )


def test_reading_the_vault_needs_a_session() -> None:
    for method, path, found in routes(build()):
        if path.startswith(("/api/vault", "/api/agent", "/api/breaches", "/api/logs")):
            assert found & {"require_session", "require_unlocked"}, f"{method} {path} is open"
