"""FastAPI application entry point."""

from fastapi import FastAPI

from serenity.routes import health

# Interactive docs are disabled: the API is only consumed by the Serenity frontend.
app = FastAPI(title="Serenity", docs_url=None, redoc_url=None, openapi_url=None)
app.include_router(health.router)
