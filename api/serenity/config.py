"""Settings loaded from environment via pydantic-settings."""

from functools import lru_cache
from pathlib import Path
from typing import Literal

from pydantic import AliasChoices, Field, SecretStr
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """Runtime configuration. Every variable is prefixed with SERENITY_."""

    model_config = SettingsConfigDict(env_prefix="SERENITY_", frozen=True, populate_by_name=True)

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
    vaultwarden_url: str = "http://vaultwarden:8080"
    ntfy_url: str = "http://ntfy:8080"

    # --- Vault (Bitwarden CLI). BW_* names are the ones `bw` itself uses. ---
    vault_sync_interval_minutes: int = Field(default=30, ge=5, le=1440)
    bw_clientid: str | None = Field(
        default=None, validation_alias=AliasChoices("BW_CLIENTID", "SERENITY_BW_CLIENTID")
    )
    bw_clientsecret: SecretStr | None = Field(
        default=None,
        validation_alias=AliasChoices("BW_CLIENTSECRET", "SERENITY_BW_CLIENTSECRET"),
    )
    # Docker secret holding the master password of the dedicated Serenity account.
    bw_password_file: Path = Field(
        default=Path("/run/secrets/bw_master_password"),
        validation_alias=AliasChoices("BW_PASSWORD_FILE", "SERENITY_BW_PASSWORD_FILE"),
    )
    bw_binary: str = "bw"
    # bw state (encrypted vault cache) lives in tmpfs: it is rebuilt at each start.
    bw_appdata_dir: Path = Path("/tmp/bw")  # noqa: S108
    bw_port: int = 8087

    @property
    def vault_configured(self) -> bool:
        secret = self.bw_clientsecret.get_secret_value() if self.bw_clientsecret else ""
        return bool(self.bw_clientid and secret)


@lru_cache
def get_settings() -> Settings:
    return Settings()  # type: ignore[call-arg]  # values come from the environment
