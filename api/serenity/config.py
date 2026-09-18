"""Settings loaded from environment via pydantic-settings."""

from functools import lru_cache
from pathlib import Path
from typing import Literal

from pydantic import Field, SecretStr
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """Runtime configuration. Every variable is prefixed with SERENITY_."""

    model_config = SettingsConfigDict(env_prefix="SERENITY_", frozen=True)

    # Keys the session token hashes stored in SQLite (HMAC-SHA256).
    secret_key: SecretStr = Field(min_length=32)
    db_path: Path = Path("/data/serenity.sqlite")
    # Argon2 hash and TOTP seed of the single user. Kept out of SQLite (see ADR-005).
    auth_file: Path = Path("/data/auth.json")
    session_ttl_hours: int = Field(default=12, ge=1, le=168)
    login_max_attempts: int = Field(default=5, ge=1, le=100)
    login_lockout_minutes: int = Field(default=15, ge=1, le=1440)
    log_level: Literal["DEBUG", "INFO", "WARNING", "ERROR"] = "INFO"
    public_url: str = "https://localhost"


@lru_cache
def get_settings() -> Settings:
    return Settings()  # type: ignore[call-arg]  # values come from the environment
