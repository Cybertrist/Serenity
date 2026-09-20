#!/usr/bin/env bash
# Records the agent at work on the demo site, then turns it into a GIF and an MP4.
# Usage: scripts/film.sh   (needs Docker, and the serenity-api-dev / serenity-web images)
#
# Nothing touches the real stack: throwaway network, throwaway vault, throwaway site.
set -euo pipefail
cd "$(dirname "$0")/.."
PLAYWRIGHT_IMAGE="mcr.microsoft.com/playwright:v1.56.0-noble"
FFMPEG_IMAGE="jrottenberg/ffmpeg:6.1-alpine"
NET="serenity-film"
OUT="$PWD/docs/img"
# Under the repo on purpose: /tmp is not the same directory for the Docker daemon.
WORK="$PWD/.film"
TOKEN="$(head -c 24 /dev/urandom | base64 | tr -d '=+/')"
# The password the demo site starts with, and the one the vault holds: a known breached one,
# so the watch really flags it and the agent really has a reason to act.
WEAK="password123"

cleanup() {
  docker rm -f film-site film-rotator film-api film-web >/dev/null 2>&1 || true
  docker network rm "$NET" >/dev/null 2>&1 || true
  rm -rf "$WORK"
}
trap cleanup EXIT
cleanup
mkdir -p "$WORK"

docker build -q -t serenity-demo:local ./demo >/dev/null
docker build -q -t serenity-rotator:local ./rotator >/dev/null
# The film must show the app as it is now, not as the last build left it.
docker build -q -t serenity-web:local ./web >/dev/null
docker network create "$NET" >/dev/null

docker run -d --name film-site --network "$NET" --network-alias demo.serenity.test \
  -e "DEMO_PASSWORD=$WEAK" serenity-demo:local >/dev/null
docker run -d --name film-rotator --network "$NET" --network-alias rotator \
  -e "SERENITY_ROTATOR_TOKEN=$TOKEN" serenity-rotator:local >/dev/null
docker run -d --name film-api --network "$NET" --network-alias api \
  -v "$PWD/api:/app" -v "$PWD/shared:/shared" -w /app \
  -e "SERENITY_ROTATOR_URL=http://rotator:8000" \
  -e "SERENITY_ROTATOR_TOKEN=$TOKEN" \
  serenity-api-dev \
  python -c "import pathlib, tempfile, uvicorn; from tests.e2e_server import build; \
uvicorn.run(build(pathlib.Path(tempfile.mkdtemp())), host='0.0.0.0', port=8000, log_level='warning')" \
  >/dev/null
docker run -d --name film-web --network "$NET" serenity-web:local >/dev/null

echo "film: waiting for the stack"
for _ in $(seq 1 90); do
  if docker run --rm --network "$NET" curlimages/curl:8.11.1 -sf http://rotator:8000/sante >/dev/null 2>&1 &&
     docker run --rm --network "$NET" curlimages/curl:8.11.1 -sf http://demo.serenity.test:8000/sante >/dev/null 2>&1 &&
     docker run --rm --network container:film-web curlimages/curl:8.11.1 -sf http://127.0.0.1:8080/api/health >/dev/null 2>&1; then
    break
  fi
  sleep 1
done

echo "film: rolling"
docker run --rm --network container:film-web --user "$(id -u):$(id -g)" -e HOME=/tmp \
  -v "$PWD:/repo:ro" -v "$WORK:/out" -e FILM_OUT=/out -w /tmp "$PLAYWRIGHT_IMAGE" \
  sh -c 'npm init -y >/dev/null && npm i --silent --no-audit --no-fund playwright@1.56.0 >/dev/null &&
         cp /repo/scripts/film.mjs . && node film.mjs'

echo "film: encoding"
mkdir -p "$OUT"
# H.264 for the release page, and a palette-built GIF for the README: one palette for the whole
# film keeps the flat surfaces flat instead of dithering them into noise.
# The source is a pile of PNG frames with their own timings, so the text stays as sharp as it
# was on screen. CRF 17 on flat interface colours is visually lossless and still small.
docker run --rm --user "$(id -u):$(id -g)" -v "$WORK:/w" -w /w "$FFMPEG_IMAGE" -y -hide_banner -loglevel error \
  -f concat -safe 0 -i frames.txt -vsync vfr -vf "fps=25,format=yuv420p" \
  -c:v libx264 -crf 17 -preset slow -movflags +faststart /w/agent.mp4
# The GIF keeps one palette for the whole film and no dithering: an interface is made of flat
# surfaces, and dithering turns them into sand.
docker run --rm --user "$(id -u):$(id -g)" -v "$WORK:/w" -w /w "$FFMPEG_IMAGE" -y -hide_banner -loglevel error \
  -f concat -safe 0 -i frames.txt -vsync vfr \
  -vf "fps=12,scale=960:-2:flags=lanczos,palettegen=max_colors=256:stats_mode=diff" /w/palette.png
docker run --rm --user "$(id -u):$(id -g)" -v "$WORK:/w" -w /w "$FFMPEG_IMAGE" -y -hide_banner -loglevel error \
  -f concat -safe 0 -i frames.txt -i /w/palette.png \
  -lavfi "fps=12,scale=960:-2:flags=lanczos[x];[x][1:v]paletteuse=dither=none:diff_mode=rectangle" \
  -loop 0 /w/agent.gif

cp "$WORK/agent.mp4" "$OUT/agent.mp4"
cp "$WORK/agent.gif" "$OUT/agent-demo.gif"
ls -lh "$OUT/agent.mp4" "$OUT/agent-demo.gif" | awk '{print $5, $9}'
