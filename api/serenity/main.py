"""FastAPI application factory (run with `uvicorn --factory serenity.main:create_app`)."""

from collections.abc import AsyncIterator
from contextlib import asynccontextmanager

from fastapi import FastAPI
from sqlmodel import Session

from serenity import audit
from serenity.config import Settings, get_settings
from serenity.db import create_db_engine, init_db
from serenity.models import Actor
from serenity.routes import auth, entries, health, logs, vault
from serenity.scheduler import start_scheduler
from serenity.vault_service import VaultService


def create_app(settings: Settings | None = None) -> FastAPI:
    settings = settings or get_settings()

    @asynccontextmanager
    async def lifespan(app: FastAPI) -> AsyncIterator[None]:
        audit.configure_logging(settings.log_level)
        engine = create_db_engine(settings.db_path)
        version = init_db(engine)
        app.state.engine = engine
        with Session(engine) as session:
            audit.record(session, Actor.SYSTEM, "app.start", details={"schema_version": version})
        app.state.vault = VaultService(settings)
        scheduler = start_scheduler(settings, app.state.vault, engine)
        yield
        scheduler.shutdown(wait=False)
        app.state.vault.close()
        engine.dispose()

    # Interactive docs are disabled: the API is only consumed by the Serenity frontend.
    app = FastAPI(
        title="Serenity", docs_url=None, redoc_url=None, openapi_url=None, lifespan=lifespan
    )
    app.state.settings = settings
    app.include_router(health.router)
    app.include_router(auth.router)
    app.include_router(logs.router)
    app.include_router(entries.router)
    app.include_router(vault.router)
    return app
