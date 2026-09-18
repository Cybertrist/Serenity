# syntax=docker/dockerfile:1
FROM python:3.12.14-slim-trixie AS base

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

# --- Bitwarden CLI (standalone OSS build, checksum pinned) ---
FROM base AS bw
ARG BW_VERSION=2026.8.0
ADD --checksum=sha256:d8bbc213d3dbdb701709386af6ea3bd763482f922ae0b538fdc3fdb88b1b1704 \
    https://github.com/bitwarden/clients/releases/download/cli-v${BW_VERSION}/bw-oss-linux-${BW_VERSION}.zip \
    /tmp/bw.zip
RUN python -c "import zipfile; zipfile.ZipFile('/tmp/bw.zip').extractall('/opt/bw')" \
    && chmod 755 /opt/bw/bw

# --- Dev image: tests and linters (used by `make test` / `make lint`) ---
FROM base AS dev
RUN pip install -e ".[dev]"
COPY tests ./tests
ENV HOME=/tmp

# --- Runtime image ---
FROM base AS runtime
RUN pip install . && rm -rf /app/build /app/*.egg-info
COPY --from=bw /opt/bw/bw /usr/local/bin/bw
# bw keeps its state in tmpfs (the root filesystem is read-only).
ENV HOME=/tmp
USER serenity
EXPOSE 8000
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
    CMD ["python", "-c", "import urllib.request; urllib.request.urlopen('http://127.0.0.1:8000/api/health', timeout=3)"]
# Only the web (nginx) container can reach the api on the internal network,
# so forwarded headers are trusted from any peer.
CMD ["uvicorn", "--factory", "serenity.main:create_app", "--host", "0.0.0.0", "--port", "8000", "--proxy-headers", "--forwarded-allow-ips", "*", "--no-server-header"]
