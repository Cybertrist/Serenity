#!/usr/bin/env bash
# A backup nobody has restored is a rumour. This drills the whole thing on a throwaway
# vault: build a database, back it up, destroy it, restore it, and check what came back.
# Used by `make backup-check` and by CI.
set -euo pipefail
cd "$(dirname "$0")/.."

WORK="$(mktemp -d)"
trap 'rm -rf "$WORK"' EXIT
export SERENITY_DATA_DIR="$WORK/data"
export SERENITY_KEYS_DIR="$WORK/keys"
export SERENITY_BACKUP_STAGE="$WORK"
export RESTIC_REPOSITORY="$WORK/repo"
export RESTIC_PASSWORD_FILE="$WORK/repo-password"
export SERENITY_API_IMAGE="${SERENITY_API_IMAGE:-serenity-api-dev}"
# Everything the drill writes must belong to the caller, so it can clean up.
export RESTIC_DOCKER_USER="$(id -u):$(id -g)"
mkdir -p "$SERENITY_DATA_DIR" "$SERENITY_KEYS_DIR"
head -c 32 /dev/urandom | base64 > "$RESTIC_PASSWORD_FILE"
head -c 32 /dev/urandom > "$SERENITY_KEYS_DIR/server.key"
head -c 32 /dev/urandom > "$SERENITY_KEYS_DIR/totp.key"

echo "== un coffre jetable, avec un compte et une entrée =="
docker run --rm --user "$(id -u):$(id -g)" -e HOME=/tmp \
  -v "$PWD/api:/app" -v "$PWD/shared:/shared" -v "$WORK:/work" -w /app \
  "$SERENITY_API_IMAGE" python -m tests.make_vault /work/data/serenity.sqlite

echo "== sauvegarde =="
ops/backup.sh

echo "== le coffre disparaît (disque perdu, VM effacée) =="
rm -rf "$SERENITY_DATA_DIR" "$SERENITY_KEYS_DIR"

echo "== restauration et vérification =="
ops/restore.sh --into "$WORK/restored"

# The keys must come back too: without the server key, the agent zone is lost for good.
for key in server totp; do
  find "$WORK/restored" -name "$key.key" | grep -q . || {
    echo "drill: $key.key absent de la sauvegarde" >&2
    exit 1
  }
done
echo "drill: base et clés restaurées, contenu vérifié."
