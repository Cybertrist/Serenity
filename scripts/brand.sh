#!/usr/bin/env bash
# Rebuild everything drawn from the mark: PNG app icons and the social banner (needs Docker).
set -euo pipefail
cd "$(dirname "$0")/.."
PLAYWRIGHT_IMAGE="mcr.microsoft.com/playwright:v1.56.0-noble"
docker run --rm --user "$(id -u):$(id -g)" -e HOME=/tmp \
  -v "$PWD:/repo" -w /tmp "$PLAYWRIGHT_IMAGE" \
  sh -c 'npm init -y >/dev/null && npm i --silent --no-audit --no-fund playwright@1.56.0 >/dev/null && cp /repo/scripts/brand.mjs . && node brand.mjs'
