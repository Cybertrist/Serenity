from pathlib import Path

from fastapi.testclient import TestClient
from pydantic import SecretStr
from sqlmodel import Session, select

from serenity.bwcli import BwCli
from serenity.config import Settings
from serenity.models import AuditLog
from serenity.vault_service import VaultService
from tests.fake_bw import FAKE_VAULT_PASSWORD, FakeBwCommands, FakeBwServe
from tests.test_auth import _login


def _install_fake_vault(client: TestClient, settings: Settings, tmp_path: Path) -> None:
    password_file = tmp_path / "bw_master_password"
    password_file.write_text("fake-master-password")
    settings = settings.model_copy(
        update={
            "bw_clientid": "user.fake",
            "bw_clientsecret": SecretStr("fake-client-secret"),
            "bw_password_file": password_file,
        }
    )
    cmds = FakeBwCommands()
    cli = BwCli("bw", Path("/tmp/bw"), runner=cmds.run, spawner=cmds.spawn)  # noqa: S108
    app = client.app
    app.state.vault = VaultService(  # type: ignore[attr-defined]
        settings, cli=cli, transport=FakeBwServe().transport, sleep=lambda _: None
    )


def test_vault_routes_require_a_session(client: TestClient) -> None:
    assert client.get("/api/vault/status").status_code == 401
    assert client.post("/api/vault/sync").status_code == 401
    assert client.get("/api/entries").status_code == 401


def test_status_when_not_configured(enrolled: Settings, client: TestClient) -> None:
    assert _login(client) == 204
    body = client.get("/api/vault/status").json()
    assert body["state"] == "not_configured"
    assert body["entries"] == 0


def test_manual_sync_fills_entries_without_passwords(
    enrolled: Settings, client: TestClient, tmp_path: Path
) -> None:
    _install_fake_vault(client, enrolled, tmp_path)
    assert _login(client) == 204
    response = client.post("/api/vault/sync")
    assert response.status_code == 200
    assert response.json()["added"] == 1
    entries = client.get("/api/entries")
    assert entries.json()[0]["domain"] == "www.example.org"
    assert FAKE_VAULT_PASSWORD not in entries.text
    status = client.get("/api/vault/status").json()
    assert status["state"] == "ready"
    assert status["entries"] == 1
    assert status["last_sync"]["added"] == 1


def test_failed_sync_is_audited(enrolled: Settings, client: TestClient) -> None:
    assert _login(client) == 204
    assert client.post("/api/vault/sync").status_code == 502
    engine = client.app.state.engine  # type: ignore[attr-defined]
    with Session(engine) as db:
        actions = [(a.action, a.outcome) for a in db.exec(select(AuditLog))]
    assert ("vault.sync", "failure") in actions
