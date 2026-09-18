from collections.abc import Iterator
from pathlib import Path

import pyotp
import pytest
from fastapi.testclient import TestClient
from sqlalchemy import Engine
from sqlmodel import Session

from serenity.auth import credentials
from serenity.config import Settings
from serenity.db import create_db_engine, init_db
from serenity.main import create_app

# Test-only fake credentials, never used anywhere else.
TEST_PASSWORD = "correct-horse-battery-staple"
TEST_TOTP_SECRET = pyotp.random_base32()


@pytest.fixture
def settings(tmp_path: Path) -> Settings:
    return Settings(
        secret_key="k" * 48,  # type: ignore[arg-type]
        db_path=tmp_path / "serenity.sqlite",
        auth_file=tmp_path / "auth.json",
        login_max_attempts=3,
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
def enrolled(settings: Settings) -> Settings:
    creds = credentials.create_credentials(TEST_PASSWORD, TEST_TOTP_SECRET)
    credentials.save_credentials(settings.auth_file, creds)
    return settings


@pytest.fixture
def client(settings: Settings) -> Iterator[TestClient]:
    # https base URL: the session cookie is `Secure`.
    with TestClient(create_app(settings), base_url="https://testserver") as client:
        yield client
