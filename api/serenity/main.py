"""FastAPI application factory. In containers it is started by `python -m serenity.run api`."""

from collections.abc import AsyncIterator
from contextlib import asynccontextmanager

from fastapi import FastAPI
from sqlmodel import Session

from serenity import audit
from serenity.auth.hashing import DummyHash
from serenity.config import Settings, get_settings
from serenity.db import create_db_engine, init_db
from serenity.models import Actor
from serenity.routes import auth, crypto, health, logs


def create_app(settings: Settings | None = None, totp_key: bytes | None = None) -> FastAPI:
    settings = settings or get_settings()

    @asynccontextmanager
    async def lifespan(app: FastAPI) -> AsyncIterator[None]:
        audit.configure_logging(settings.log_level)
        engine = create_db_engine(settings.db_path)
        version = init_db(engine)
        app.state.engine = engine
        with Session(engine) as session:
            audit.record(session, Actor.SYSTEM, "app.start", details={"schema_version": version})
        yield
        engine.dispose()

    # Interactive docs are disabled: the API is only consumed by the Serenity frontend.
    app = FastAPI(
        title="Serenity", docs_url=None, redoc_url=None, openapi_url=None, lifespan=lifespan
    )
    app.state.settings = settings
    # Encrypts login TOTP secrets at rest (phase 3). Loaded from a root-only key file.
    app.state.totp_key = totp_key
    app.state.dummy_hash = DummyHash(settings)
    app.include_router(health.router)
    app.include_router(auth.router)
    app.include_router(logs.router)
    app.include_router(crypto.router)
    return app
