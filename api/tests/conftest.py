from collections.abc import Iterator
from dataclasses import dataclass
from pathlib import Path

import nacl.utils
import pyotp
import pytest
from fastapi.testclient import TestClient
from sqlalchemy import Engine
from sqlmodel import Session

from serenity.agent.service import publish_server_key
from serenity.config import Settings
from serenity.db import create_db_engine, init_db
from serenity.devclient import Client
from serenity.main import create_app
from serenity.models import utcnow

# Test-only throwaway values.
PASSWORD = "une phrase de passe de test"
USERNAME = "tristan"


@pytest.fixture
def settings(tmp_path: Path) -> Settings:
    return Settings(
        secret_key="k" * 48,  # type: ignore[arg-type]
        db_path=tmp_path / "serenity.sqlite",
        login_max_attempts=3,
        # Cheap server-side hashing in tests; the client-side Argon2id floor is unchanged.
        auth_hash_memlimit=8 * 1024 * 1024,
        auth_hash_opslimit=1,
    )


@pytest.fixture
def engine(settings: Settings) -> Iterator[Engine]:
    engine = create_db_engine(settings.db_path)
    init_db(engine)
    yield engine
    engine.dispose()


@pytest.fixture
def db(engine: Engine) -> Iterator[Session]:
    with Session(engine) as session:
        yield session


@pytest.fixture
def client(settings: Settings) -> Iterator[TestClient]:
    # https base URL: the session cookie is `Secure`.
    app = create_app(settings, totp_key=nacl.utils.random(32))
    with TestClient(app, base_url="https://testserver") as client:
        yield client


class Clock:
    """Controls the time seen by TOTP checks: each `tick` moves to the next 30 s step."""

    def __init__(self) -> None:
        self.now = 1_900_000_000.0

    def __call__(self) -> float:
        return self.now

    def tick(self) -> None:
        self.now += 30


@pytest.fixture
def clock(monkeypatch: pytest.MonkeyPatch) -> Clock:
    clock = Clock()
    monkeypatch.setattr("serenity.auth.totp.now", clock)
    return clock


@dataclass
class Account:
    """A signed-up account and the means to produce TOTP codes for it."""

    api: Client
    user_id: str
    totp_secret: str
    recovery_kit: str
    clock: Clock

    def code(self) -> str:
        """A fresh code: moves the clock one step so the anti-replay check accepts it."""
        self.clock.tick()
        return pyotp.TOTP(self.totp_secret).at(int(self.clock.now))


@pytest.fixture
def agent_ready(client: TestClient) -> bytes:
    seed = nacl.utils.random(32)
    with Session(client.app.state.engine) as db:  # type: ignore[attr-defined]
        publish_server_key(db, seed, utcnow())
    return seed


@pytest.fixture
def account(client: TestClient, agent_ready: bytes, clock: Clock) -> Account:
    api = Client(client)
    out = api.signup(USERNAME, PASSWORD)
    acc = Account(api, out["user_id"], out["totp_secret"], out["recovery_kit"], clock)
    api.confirm(acc.user_id, acc.code())
    return acc
