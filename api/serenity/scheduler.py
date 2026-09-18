"""APScheduler jobs: vault sync (watcher and due rotations in later phases)."""

import contextlib
import logging
from datetime import timedelta

from apscheduler.schedulers.background import BackgroundScheduler
from sqlalchemy import Engine

from serenity.config import Settings
from serenity.models import utcnow
from serenity.vault import VaultError
from serenity.vault_service import VaultService
from serenity.vault_sync import run_sync

logger = logging.getLogger(__name__)


def _vault_sync_job(service: VaultService, engine: Engine) -> None:
    # Failures are already logged and audited; the job retries at the next run.
    with contextlib.suppress(VaultError):
        run_sync(service, engine)


def start_scheduler(
    settings: Settings, service: VaultService, engine: Engine
) -> BackgroundScheduler:
    scheduler = BackgroundScheduler(timezone="UTC")
    if settings.vault_configured:
        scheduler.add_job(
            _vault_sync_job,
            "interval",
            minutes=settings.vault_sync_interval_minutes,
            args=[service, engine],
            id="vault_sync",
            max_instances=1,
            coalesce=True,
            # First run shortly after startup, once the api is up.
            next_run_time=utcnow() + timedelta(seconds=5),
        )
    else:
        logger.warning("vault not configured (BW_CLIENTID / BW_CLIENTSECRET): sync disabled")
    scheduler.start()
    return scheduler
