import os
import threading
from pathlib import Path

import nacl.utils
import pytest
from fastapi.testclient import TestClient
from sqlalchemy import Engine
from sqlmodel import Session, select

from serenity import secrets
from serenity.agent.service import Agent, ServerKeyMismatchError, publish_server_key
from serenity.config import Settings
from serenity.crypto.encoding import b64url_decode
from serenity.crypto.sealed import key_id, server_keypair
from serenity.db import MIGRATIONS, check_schema
from serenity.models import AuditLog, utcnow

# --- key files -----------------------------------------------------------------


def test_key_file_must_be_32_bytes(tmp_path: Path) -> None:
    good = tmp_path / "good.key"
    good.write_bytes(bytes(32))
    assert secrets.read_key_file(good) == bytes(32)
    bad = tmp_path / "bad.key"
    bad.write_bytes(bytes(31))
    with pytest.raises(secrets.SecretFileError):
        secrets.read_key_file(bad)
    with pytest.raises(secrets.SecretFileError, match="make keys"):
        secrets.read_key_file(tmp_path / "missing.key")


def test_key_file_errors_never_contain_the_key(tmp_path: Path) -> None:
    path = tmp_path / "long.key"
    path.write_bytes(b"super-secret-value-" * 3)
    with pytest.raises(secrets.SecretFileError) as exc:
        secrets.read_key_file(path)
    assert "super-secret" not in str(exc.value)


def test_drop_privileges_refuses_to_run_as_non_root(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setattr(os, "getuid", lambda: 1000)
    with pytest.raises(secrets.SecretFileError, match="root"):
        secrets.drop_privileges()


def test_drop_privileges_switches_and_cannot_come_back(monkeypatch: pytest.MonkeyPatch) -> None:
    state = {"uid": 0, "gid": 0, "groups": [0]}

    def setuid(uid: int) -> None:
        if state["uid"] != 0:
            raise PermissionError
        state["uid"] = uid

    monkeypatch.setattr(os, "getuid", lambda: state["uid"])
    monkeypatch.setattr(os, "geteuid", lambda: state["uid"])
    monkeypatch.setattr(os, "getgid", lambda: state["gid"])
    monkeypatch.setattr(os, "setgroups", lambda g: state.update(groups=g))
    monkeypatch.setattr(os, "setgid", lambda g: state.update(gid=g))
    monkeypatch.setattr(os, "setuid", setuid)
    secrets.drop_privileges()
    assert state == {"uid": 10001, "gid": 10001, "groups": []}


def test_drop_privileges_detects_a_failed_drop(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setattr(os, "getuid", lambda: 0)
    monkeypatch.setattr(os, "geteuid", lambda: 0)
    monkeypatch.setattr(os, "getgid", lambda: 0)
    monkeypatch.setattr(os, "setgroups", lambda g: None)
    monkeypatch.setattr(os, "setgid", lambda g: None)
    monkeypatch.setattr(os, "setuid", lambda u: None)
    with pytest.raises(secrets.SecretFileError, match="failed"):
        secrets.drop_privileges()


# --- agent ---------------------------------------------------------------------


def test_agent_publishes_the_public_key_only(db: Session) -> None:
    seed = nacl.utils.random(32)
    info = publish_server_key(db, seed, utcnow())
    public_key, secret_key = server_keypair(seed)
    assert b64url_decode(info["public_key"]) == public_key
    assert b64url_decode(info["key_id"]) == key_id(public_key)
    rows = [log.model_dump_json() for log in db.exec(select(AuditLog))]
    for secret in (seed, secret_key):
        assert all(secret.hex() not in row for row in rows)
    # Same key again: accepted, not republished.
    assert publish_server_key(db, seed, utcnow()) == info


def test_agent_refuses_a_different_server_key(db: Session) -> None:
    publish_server_key(db, nacl.utils.random(32), utcnow())
    with pytest.raises(ServerKeyMismatchError, match="restore"):
        publish_server_key(db, nacl.utils.random(32), utcnow())


def test_agent_does_not_migrate(engine: Engine) -> None:
    assert check_schema(engine) == len(MIGRATIONS)
    with pytest.raises(RuntimeError, match="start the api first"):
        check_schema(engine, [*MIGRATIONS, lambda s: None])


def test_agent_runs_heartbeat_and_stops(settings: Settings, engine: Engine, tmp_path: Path) -> None:
    beat = tmp_path / "heartbeat"
    settings = settings.model_copy(update={"agent_heartbeat_file": beat})
    agent = Agent(settings, engine, nacl.utils.random(32))
    agent.start()
    thread = threading.Thread(target=agent.run_forever)
    thread.start()
    agent.stop_event.set()
    thread.join(timeout=5)
    assert not thread.is_alive()
    assert beat.exists()
    with Session(engine) as db:
        actions = [log.action for log in db.exec(select(AuditLog))]
    assert actions[-2:] == ["agent.start", "agent.stop"]


# --- api -----------------------------------------------------------------------


def test_server_key_route(client: TestClient, engine: Engine) -> None:
    assert client.get("/api/crypto/server-key").status_code == 503
    with Session(engine) as db:
        info = publish_server_key(db, nacl.utils.random(32), utcnow())
    response = client.get("/api/crypto/server-key")
    assert response.status_code == 200
    assert response.json() == info
