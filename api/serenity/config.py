"""Settings loaded from environment via pydantic-settings."""

from functools import lru_cache
from pathlib import Path
from typing import Literal

from pydantic import AliasChoices, Field, SecretStr, field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """Runtime configuration. Every variable is prefixed with SERENITY_."""

    model_config = SettingsConfigDict(env_prefix="SERENITY_", frozen=True, populate_by_name=True)

    # Keys the session token hashes and the fake prelogin salts (HMAC / keyed BLAKE2b).
    secret_key: SecretStr = Field(min_length=32)
    db_path: Path = Path("/data/serenity.sqlite")
    # Device session: full login (master password + TOTP) every N days (docs/crypto.md §7.3).
    device_session_days: int = Field(default=60, ge=1, le=365)
    # Unlocked level: sensitive actions need the master password within this sliding window.
    unlock_minutes: int = Field(default=15, ge=1, le=240)
    # Progressive lockout: after N failures, lock for base * 2^(k-1) minutes (max 24 h).
    login_max_attempts: int = Field(default=5, ge=1, le=100)
    login_lockout_base_minutes: int = Field(default=1, ge=1, le=60)
    # Server-side Argon2id cost for hashing AuthKey / RAK (libsodium crypto_pwhash_str).
    auth_hash_memlimit: int = Field(default=64 * 1024 * 1024, ge=8 * 1024 * 1024)
    auth_hash_opslimit: int = Field(default=3, ge=1)
    log_level: Literal["DEBUG", "INFO", "WARNING", "ERROR"] = "INFO"
    public_url: str = "https://localhost"
    # Key files (root:root 0400 on the host, see docs/02-infrastructure.md).
    # The server key is mounted in the agent only; the TOTP key in the api only.
    server_key_file: Path = Path("/run/serenity/server.key")
    totp_key_file: Path = Path("/run/serenity/totp.key")
    agent_heartbeat_file: Path = Path("/tmp/agent-heartbeat")  # noqa: S108 (tmpfs)
    agent_heartbeat_seconds: int = Field(default=30, ge=5, le=300)
    # Server-side watch of the agent zone.
    watch_interval_hours: int = Field(default=6, ge=1, le=168)
    watch_first_delay_seconds: int = Field(default=60, ge=0, le=3600)
    # Agent limits (docs/06-agent.md): allowlist file and rotations per day.
    allowlist_file: Path = Path("/app/allowlist.yaml")
    max_rotations_per_day: int = Field(default=3, ge=0, le=100)
    schedule_interval_minutes: int = Field(default=60, ge=1, le=1440)
    # Paid Have I Been Pwned key for watched e-mails; empty = disabled. Given to the agent only.
    hibp_api_key: SecretStr | None = Field(
        default=None, validation_alias=AliasChoices("HIBP_API_KEY", "SERENITY_HIBP_API_KEY")
    )
    # Told to the api (which never gets the key) so the interface can say whether it is active.
    hibp_enabled: bool = False

    @field_validator("hibp_enabled", mode="before")
    @classmethod
    def _empty_is_false(cls, value: object) -> object:
        # docker-compose passes "" when HIBP_API_KEY is not set.
        return False if value == "" else value


@lru_cache
def get_settings() -> Settings:
    return Settings()  # type: ignore[call-arg]  # values come from the environment
