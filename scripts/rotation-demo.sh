#!/usr/bin/env bash
# The agent rotating a real password on a real site, in a real browser: demo site + executor
# + the agent's own code (docs/07-rotation.md). Used by `make rotation-demo` and by CI.
set -euo pipefail
cd "$(dirname "$0")/.."
NET="serenity-rotation-demo"
TOKEN="$(head -c 24 /dev/urandom | base64 | tr -d '=+/')"
DEMO_PASSWORD="mot-de-passe-de-depart"

cleanup() {
  docker rm -f rotation-demo-site rotation-demo-rotator >/dev/null 2>&1 || true
  docker network rm "$NET" >/dev/null 2>&1 || true
}
trap cleanup EXIT
cleanup

docker build -q -t serenity-demo:local ./demo >/dev/null
docker build -q -t serenity-rotator:local ./rotator >/dev/null
docker network create "$NET" >/dev/null

docker run -d --name rotation-demo-site --network "$NET" --network-alias demo.serenity.test \
  -e "DEMO_PASSWORD=$DEMO_PASSWORD" serenity-demo:local >/dev/null
docker run -d --name rotation-demo-rotator --network "$NET" --network-alias rotator \
  -e "SERENITY_ROTATOR_TOKEN=$TOKEN" serenity-rotator:local >/dev/null

# Wait for both: the executor starts a browser, which takes a moment.
for _ in $(seq 1 60); do
  if docker run --rm --network "$NET" curlimages/curl:8.11.1 \
      -sf http://rotator:8000/sante >/dev/null 2>&1 &&
     docker run --rm --network "$NET" curlimages/curl:8.11.1 \
      -sf http://demo.serenity.test:8000/sante >/dev/null 2>&1; then break; fi
  sleep 1
done

docker run --rm --network "$NET" --user "$(id -u):$(id -g)" \
  -v "$PWD/api:/app" -v "$PWD/shared:/shared" -w /app \
  -e "SERENITY_ROTATOR_URL=http://rotator:8000" \
  -e "SERENITY_DEMO_URL=http://demo.serenity.test:8000" \
  -e "SERENITY_ROTATOR_TOKEN=$TOKEN" \
  -e "DEMO_PASSWORD=$DEMO_PASSWORD" \
  serenity-api-dev pytest tests/test_rotation_demo.py -v
