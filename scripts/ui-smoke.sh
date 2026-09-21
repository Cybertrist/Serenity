#!/usr/bin/env bash
# UI smoke test: production web image (nginx + CSP) + throwaway test API + Playwright Chromium.
# Usage: scripts/ui-smoke.sh [screenshots-dir]   (needs the serenity-api-dev and serenity-web images)
set -euo pipefail
cd "$(dirname "$0")/.."
SHOTS="$(realpath -m "${1:-web/e2e/shots}")"
PLAYWRIGHT_IMAGE="mcr.microsoft.com/playwright:v1.56.0-noble"
NET="serenity-ui-smoke"

cleanup() {
  docker rm -f ui-smoke-api ui-smoke-web >/dev/null 2>&1 || true
  docker network rm "$NET" >/dev/null 2>&1 || true
}
trap cleanup EXIT
cleanup
mkdir -p "$SHOTS"
# Drop the captures of the previous run: inserting a screen renumbers every file after it, and
# the stale names would sit next to the fresh ones, hours older and easy to read as current.
find "$SHOTS" -maxdepth 1 -name '*.png' -delete

docker network create "$NET" >/dev/null
# ma-banque.test is the site the icon pass pretends to fetch: the address is public (so the
# checks of agent/icons.py pass) and nothing is ever sent to it (the transport is a double).
docker run -d --name ui-smoke-api --network "$NET" --network-alias api \
  --add-host=ma-banque.test:93.184.216.34 \
  -v "$PWD/api:/app" -w /app serenity-api-dev \
  python -c "import pathlib, tempfile, uvicorn; from tests.e2e_server import build; \
uvicorn.run(build(pathlib.Path(tempfile.mkdtemp())), host='0.0.0.0', port=8000, log_level='warning')" >/dev/null
docker run -d --name ui-smoke-web --network "$NET" serenity-web:local >/dev/null

# Wait for nginx and the api behind it.
for _ in $(seq 1 30); do
  if docker run --rm --network container:ui-smoke-web curlimages/curl:8.11.1 -sf http://127.0.0.1:8080/api/health >/dev/null 2>&1; then break; fi
  sleep 1
done

docker run --rm --network container:ui-smoke-web --user "$(id -u):$(id -g)" -e HOME=/tmp \
  -v "$PWD/web/e2e:/e2e:ro" -v "$SHOTS:/shots" -e UI_SHOTS=/shots -w /tmp "$PLAYWRIGHT_IMAGE" \
  sh -c 'npm init -y >/dev/null && npm i --silent --no-audit --no-fund playwright@1.56.0 >/dev/null && cp /e2e/ui-smoke.mjs . && node ui-smoke.mjs'
