"""In-memory fake of `bw serve` (httpx transport) and of the `bw` command line."""

import json
import subprocess
from copy import deepcopy
from typing import Any

import httpx

ITEM_ID = "0f0c7a9e-1b2c-4d5e-8f90-123456789abc"
NOTE_ID = "1f0c7a9e-1b2c-4d5e-8f90-123456789abc"
FAKE_VAULT_PASSWORD = "vault-item-password-42"


def login_item(item_id: str = ITEM_ID, name: str = "Example", **login: Any) -> dict[str, Any]:
    return {
        "id": item_id,
        "type": 1,
        "name": name,
        "organizationId": "org-1",
        "collectionIds": ["col-1"],
        "creationDate": "2026-01-01T10:00:00.000Z",
        "revisionDate": "2026-02-01T10:00:00.000Z",
        "notes": "keep me",
        "login": {
            "username": "me@example.org",
            "password": FAKE_VAULT_PASSWORD,
            "passwordRevisionDate": None,
            "uris": [{"match": None, "uri": "https://www.Example.org/login"}],
        }
        | login,
    }


class FakeBwServe:
    def __init__(self, items: list[dict[str, Any]] | None = None, state: str = "unlocked") -> None:
        self.items = {i["id"]: i for i in (items or [login_item()])}
        self.state = state
        self.syncs = 0
        self.fail_with: int | None = None
        self.transport = httpx.MockTransport(self.handle)

    def _ok(self, data: Any) -> httpx.Response:
        return httpx.Response(200, json={"success": True, "data": data})

    def handle(self, request: httpx.Request) -> httpx.Response:
        if self.fail_with:
            return httpx.Response(self.fail_with, json={"success": False, "message": "boom"})
        path, method = request.url.path, request.method
        if path == "/status":
            return self._ok({"object": "template", "template": {"status": self.state}})
        if self.state != "unlocked":
            return httpx.Response(400, json={"success": False, "message": "Vault is locked."})
        if path == "/sync" and method == "POST":
            self.syncs += 1
            return self._ok({"object": "message", "title": "Syncing complete."})
        if path == "/list/object/items":
            return self._ok({"object": "list", "data": deepcopy(list(self.items.values()))})
        if path.startswith("/object/item/"):
            item_id = path.rsplit("/", 1)[1]
            if item_id not in self.items:
                return httpx.Response(404, json={"success": False, "message": "Not found."})
            if method == "PUT":
                self.items[item_id] = json.loads(request.content)
            return self._ok(deepcopy(self.items[item_id]))
        return httpx.Response(404, json={"success": False, "message": "Not found."})


class FakeProcess:
    def __init__(self) -> None:
        self.returncode: int | None = None

    def poll(self) -> int | None:
        return self.returncode

    def terminate(self) -> None:
        self.returncode = -15

    def wait(self, timeout: float | None = None) -> int:
        return self.returncode or 0

    def kill(self) -> None:
        self.returncode = -9


class FakeBwCommands:
    """Records `bw` invocations and answers like the real CLI."""

    def __init__(self, status: str = "unauthenticated") -> None:
        self.status = status
        self.calls: list[tuple[list[str], dict[str, str]]] = []
        self.spawned: list[tuple[list[str], dict[str, str]]] = []
        self.fail_on: str | None = None

    def run(self, args: list[str], *, env: dict[str, str], **_: Any) -> Any:
        self.calls.append((args, env))
        command = args[2]
        if command == self.fail_on:
            return subprocess.CompletedProcess(args, 1, "", "Invalid master password.")
        out = ""
        if command == "status":
            out = 'Could not find dir, "/tmp/bw"; creating it instead.\n' + json.dumps(
                {"serverUrl": None, "status": self.status}
            )
        elif command == "login":
            self.status = "locked"
        elif command == "unlock":
            self.status = "unlocked"
            out = "fake-session-key"
        return subprocess.CompletedProcess(args, 0, out, "")

    def spawn(self, args: list[str], *, env: dict[str, str], **_: Any) -> Any:
        self.spawned.append((args, env))
        return FakeProcess()
