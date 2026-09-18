"""Keeps `bw serve` running and unlocked, and hands out a ready `Vault` client."""

import logging
import subprocess
import threading
import time
from collections.abc import Callable
from enum import StrEnum

import httpx

from serenity.bwcli import BwCli, BwError
from serenity.config import Settings
from serenity.vault import Vault, VaultError

logger = logging.getLogger(__name__)


class VaultState(StrEnum):
    NOT_CONFIGURED = "not_configured"
    STOPPED = "stopped"
    READY = "ready"
    ERROR = "error"


class VaultService:
    def __init__(
        self,
        settings: Settings,
        cli: BwCli | None = None,
        transport: httpx.BaseTransport | None = None,
        sleep: Callable[[float], None] = time.sleep,
    ) -> None:
        self._settings = settings
        self._cli = cli or BwCli(settings.bw_binary, settings.bw_appdata_dir)
        self._client = httpx.Client(
            base_url=f"http://127.0.0.1:{settings.bw_port}", transport=transport, timeout=60
        )
        self._vault = Vault(self._client)
        self._sleep = sleep
        self._process: subprocess.Popen[bytes] | None = None
        self._lock = threading.Lock()
        self.state = VaultState.STOPPED if settings.vault_configured else VaultState.NOT_CONFIGURED
        self.last_error: str | None = None

    def ready(self) -> Vault:
        """Return an unlocked vault client, starting `bw serve` if needed."""
        with self._lock:
            try:
                if self._serving() and self._vault.status() == "unlocked":
                    return self._vault
                self._start()
            except (BwError, VaultError) as exc:
                self.state = VaultState.ERROR
                self.last_error = str(exc)
                self._stop()
                raise VaultError(str(exc)) from None
            self.state = VaultState.READY
            self.last_error = None
            return self._vault

    def close(self) -> None:
        with self._lock:
            self._stop()
            self._client.close()

    def _serving(self) -> bool:
        return self._process is not None and self._process.poll() is None

    def _start(self) -> None:
        self._stop()
        settings = self._settings
        if not (settings.bw_clientid and settings.bw_clientsecret):
            raise VaultError("vault not configured")
        if self._cli.status().get("status") == "unauthenticated":
            logger.info("bw: configuring server and logging in with the API key")
            self._cli.configure_server(settings.vaultwarden_url)
            self._cli.login(settings.bw_clientid, settings.bw_clientsecret)
        session = self._cli.unlock(settings.bw_password_file)
        logger.info("bw: vault unlocked, starting bw serve on 127.0.0.1:%d", settings.bw_port)
        self._process = self._cli.serve(session, settings.bw_port)
        self._wait_until_serving()

    def _wait_until_serving(self, attempts: int = 60) -> None:
        for _ in range(attempts):
            if not self._serving():
                raise VaultError("bw serve exited during startup")
            try:
                if self._vault.status() == "unlocked":
                    return
            except VaultError:
                pass
            self._sleep(0.5)
        raise VaultError("bw serve did not become ready")

    def _stop(self) -> None:
        if self._process is not None and self._process.poll() is None:
            self._process.terminate()
            try:
                self._process.wait(timeout=10)
            except subprocess.TimeoutExpired:
                self._process.kill()
        self._process = None
        if self.state is VaultState.READY:
            self.state = VaultState.STOPPED
