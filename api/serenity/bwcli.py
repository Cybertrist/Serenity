"""Bitwarden CLI process: configure, log in, unlock and run `bw serve` on 127.0.0.1.

The master password never goes through Python: `bw unlock --passwordfile` reads the
Docker secret itself. The session key only lives in the environment of `bw serve`.
"""

import json
import os
import subprocess
from collections.abc import Callable, Sequence
from pathlib import Path
from typing import Any

from pydantic import SecretStr

from serenity.audit import redact_text

Runner = Callable[..., subprocess.CompletedProcess[str]]
Spawner = Callable[..., subprocess.Popen[bytes]]


class BwError(RuntimeError):
    """A `bw` command failed. The message never contains a secret."""


class BwCli:
    def __init__(
        self,
        binary: str,
        appdata_dir: Path,
        runner: Runner = subprocess.run,
        spawner: Spawner = subprocess.Popen,
    ) -> None:
        self._binary = binary
        self._appdata_dir = appdata_dir
        self._run_cmd = runner
        self._spawn = spawner

    def _env(self, extra: dict[str, str] | None = None) -> dict[str, str]:
        # Minimal environment: the api's own variables (and secrets) are not inherited.
        env = {
            "PATH": os.environ.get("PATH", "/usr/local/bin:/usr/bin:/bin"),
            "HOME": str(self._appdata_dir.parent),
            "BITWARDENCLI_APPDATA_DIR": str(self._appdata_dir),
            "BW_NOINTERACTION": "true",
        }
        return env | (extra or {})

    def _run(self, args: Sequence[str], extra_env: dict[str, str] | None = None) -> str:
        try:
            result = self._run_cmd(
                [self._binary, "--nointeraction", *args],
                env=self._env(extra_env),
                capture_output=True,
                text=True,
                timeout=120,
                check=False,
            )
        except (OSError, subprocess.TimeoutExpired) as exc:
            raise BwError(f"bw {args[0]}: {type(exc).__name__}") from None
        if result.returncode != 0:
            detail = redact_text((result.stderr or result.stdout or "").strip()[:200])
            raise BwError(f"bw {args[0]} failed (exit {result.returncode}): {detail}")
        return result.stdout

    def status(self) -> dict[str, Any]:
        """`bw status` output: serverUrl, userEmail, status (unauthenticated/locked/unlocked)."""
        out = self._run(["status"])
        # bw may print "creating data file" notices before the JSON document.
        start = out.find("{")
        if start < 0:
            raise BwError("bw status: unexpected output")
        data: dict[str, Any] = json.loads(out[start:])
        return data

    def configure_server(self, url: str) -> None:
        self._run(["config", "server", url])

    def login(self, client_id: str, client_secret: SecretStr) -> None:
        self._run(
            ["login", "--apikey"],
            {"BW_CLIENTID": client_id, "BW_CLIENTSECRET": client_secret.get_secret_value()},
        )

    def unlock(self, password_file: Path) -> SecretStr:
        if not password_file.is_file():
            raise BwError(f"password file {password_file} not found")
        session = self._run(["unlock", "--passwordfile", str(password_file), "--raw"]).strip()
        if not session:
            raise BwError("bw unlock returned no session key")
        return SecretStr(session)

    def serve(self, session: SecretStr, port: int) -> subprocess.Popen[bytes]:
        return self._spawn(
            [self._binary, "serve", "--hostname", "127.0.0.1", "--port", str(port)],
            env=self._env({"BW_SESSION": session.get_secret_value()}),
            stdin=subprocess.DEVNULL,
            stdout=subprocess.DEVNULL,
            stderr=subprocess.DEVNULL,
        )
