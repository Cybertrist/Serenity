# syntax=docker/dockerfile:1
FROM python:3.14.6-slim-trixie AS base

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PIP_NO_CACHE_DIR=1 \
    PIP_DISABLE_PIP_VERSION_CHECK=1

# Fixed non-root UID so ./data/api can be chowned on the host.
RUN useradd --system --uid 10001 --user-group --no-create-home --home-dir /app serenity
WORKDIR /app
COPY pyproject.toml ./
COPY serenity ./serenity
COPY allowlist.yaml ./

# --- Dev image: tests and linters (used by `make test` / `make lint`) ---
FROM base AS dev
RUN pip install -e ".[dev]"
COPY tests ./tests
ENV HOME=/tmp

# --- Runtime image ---
# Starts as root on purpose: `serenity.run` reads the root-only key file, then drops to
# UID 10001 before serving anything (see docs/decisions/ADR-007).
FROM base AS runtime
RUN pip install . && rm -rf /app/build /app/*.egg-info
EXPOSE 8000
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
    CMD ["python", "-c", "import urllib.request; urllib.request.urlopen('http://127.0.0.1:8000/api/health', timeout=3)"]
CMD ["python", "-m", "serenity.run", "api"]
