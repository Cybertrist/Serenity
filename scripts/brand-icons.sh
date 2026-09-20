#!/usr/bin/env bash
# Rebuild the PNG app icons from web/public/icon.svg and maskable.svg (needs Docker).
set -euo pipefail
cd "$(dirname "$0")/.."
PLAYWRIGHT_IMAGE="mcr.microsoft.com/playwright:v1.56.0-noble"
docker run --rm --user "$(id -u):$(id -g)" -e HOME=/tmp \
  -v "$PWD/web/public:/public" -v "$PWD/scripts/brand-icons.mjs:/tmp/brand-icons.mjs:ro" \
  -w /tmp "$PLAYWRIGHT_IMAGE" \
  sh -c 'npm init -y >/dev/null && npm i --silent --no-audit --no-fund playwright@1.56.0 >/dev/null && node brand-icons.mjs'
