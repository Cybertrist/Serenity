from pathlib import Path

import pytest
from pydantic import SecretStr

from serenity.bwcli import BwCli
from serenity.config import Settings
from serenity.vault import VaultError
from serenity.vault_service import VaultService, VaultState
from tests.fake_bw import FakeBwCommands, FakeBwServe

CLIENT_SECRET = "fake-client-secret"


@pytest.fixture
def vault_settings(settings: Settings, tmp_path: Path) -> Settings:
    password_file = tmp_path / "bw_master_password"
    password_file.write_text("fake-master-password")
    return settings.model_copy(
        update={
            "bw_clientid": "user.fake",
            "bw_clientsecret": SecretStr(CLIENT_SECRET),
            "bw_password_file": password_file,
        }
    )


def _service(settings: Settings, cmds: FakeBwCommands, serve: FakeBwServe) -> VaultService:
    cli = BwCli("bw", Path("/tmp/bw"), runner=cmds.run, spawner=cmds.spawn)  # noqa: S108
    return VaultService(settings, cli=cli, transport=serve.transport, sleep=lambda _: None)


def test_not_configured_without_api_key(settings: Settings) -> None:
    service = VaultService(settings)
    assert service.state is VaultState.NOT_CONFIGURED
    with pytest.raises(VaultError):
        service.ready()


def test_first_start_logs_in_unlocks_and_serves(vault_settings: Settings) -> None:
    cmds = FakeBwCommands()
    service = _service(vault_settings, cmds, FakeBwServe())
    service.ready()
    commands = [args[2] for args, _ in cmds.calls]
    assert commands == ["status", "config", "login", "unlock"]
    assert service.state is VaultState.READY
    serve_args, serve_env = cmds.spawned[0]
    assert serve_args[1:5] == ["serve", "--hostname", "127.0.0.1", "--port"]
    assert serve_env["BW_SESSION"] == "fake-session-key"


def test_master_password_never_travels_in_arguments_or_env(vault_settings: Settings) -> None:
    cmds = FakeBwCommands()
    _service(vault_settings, cmds, FakeBwServe()).ready()
    for args, env in cmds.calls + cmds.spawned:
        assert "fake-master-password" not in " ".join(args)
        assert "fake-master-password" not in " ".join(env.values())
    unlock_args = next(args for args, _ in cmds.calls if args[2] == "unlock")
    assert "--passwordfile" in unlock_args


def test_client_secret_only_given_to_login(vault_settings: Settings) -> None:
    cmds = FakeBwCommands()
    _service(vault_settings, cmds, FakeBwServe()).ready()
    for args, env in cmds.calls + cmds.spawned:
        has_secret = env.get("BW_CLIENTSECRET") == CLIENT_SECRET
        assert has_secret == (args[1:3] == ["--nointeraction", "login"])


def test_ready_reuses_the_running_server(vault_settings: Settings) -> None:
    cmds = FakeBwCommands()
    service = _service(vault_settings, cmds, FakeBwServe())
    service.ready()
    service.ready()
    assert len(cmds.spawned) == 1


def test_restarts_when_bw_serve_died(vault_settings: Settings) -> None:
    cmds = FakeBwCommands()
    service = _service(vault_settings, cmds, FakeBwServe())
    service.ready()
    service._process.returncode = 1  # type: ignore[union-attr]
    service.ready()
    assert len(cmds.spawned) == 2
    # Already logged in: no second login.
    assert [args[2] for args, _ in cmds.calls].count("login") == 1


def test_unlock_failure_is_reported(vault_settings: Settings) -> None:
    cmds = FakeBwCommands()
    cmds.fail_on = "unlock"
    service = _service(vault_settings, cmds, FakeBwServe())
    with pytest.raises(VaultError):
        service.ready()
    assert service.state is VaultState.ERROR
    assert service.last_error is not None
    assert "fake-master-password" not in service.last_error
    assert not cmds.spawned


def test_missing_password_file_is_reported(vault_settings: Settings, tmp_path: Path) -> None:
    settings = vault_settings.model_copy(update={"bw_password_file": tmp_path / "missing"})
    service = _service(settings, FakeBwCommands(), FakeBwServe())
    with pytest.raises(VaultError, match="not found"):
        service.ready()
