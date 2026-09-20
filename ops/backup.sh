#!/usr/bin/env bash
# Nightly backup of everything that cannot be rebuilt: the encrypted vault and the two key
# files. Run as root on the VM (systemd timer), or by hand with `make backup-now`.
#
# What it does, in order:
#   1. a consistent snapshot of the SQLite database (VACUUM INTO, never a copy of a live file);
#   2. the key files, if they are included (see SERENITY_BACKUP_KEYS);
#   3. one restic snapshot of that staging directory, then retention.
#
# The staging directory lives in a tmpfs and is removed whatever happens, including on error.
# Nothing here ever prints a secret: restic reads its password from a file it never echoes.
set -euo pipefail
cd "$(dirname "$0")/.."

RESTIC_IMAGE="${RESTIC_IMAGE:-restic/restic:0.18.1}"
API_IMAGE="${SERENITY_API_IMAGE:-serenity-api:local}"
DATA_DIR="${SERENITY_DATA_DIR:-$PWD/data/api}"
KEYS_DIR="${SERENITY_KEYS_DIR:-$PWD/data/keys}"
DB_NAME="${SERENITY_DB_NAME:-serenity.sqlite}"
BACKUP_KEYS="${SERENITY_BACKUP_KEYS:-true}"
KEEP_DAILY="${SERENITY_BACKUP_KEEP_DAILY:-7}"
KEEP_WEEKLY="${SERENITY_BACKUP_KEEP_WEEKLY:-4}"
KEEP_MONTHLY="${SERENITY_BACKUP_KEEP_MONTHLY:-6}"

# Values come from .env unless the caller set them (the drill does).
if [ -f .env ] && [ -z "${RESTIC_REPOSITORY:-}" ]; then
  set -a
  # shellcheck disable=SC1091
  . ./.env
  set +a
fi

: "${RESTIC_REPOSITORY:?set RESTIC_REPOSITORY in .env}"
: "${RESTIC_PASSWORD_FILE:?set RESTIC_PASSWORD_FILE in .env}"
[ -r "$RESTIC_PASSWORD_FILE" ] || { echo "unreadable: $RESTIC_PASSWORD_FILE" >&2; exit 1; }

STAGE="$(mktemp -d "${SERENITY_BACKUP_STAGE:-/tmp}/serenity-backup.XXXXXX")"
chmod 700 "$STAGE"
cleanup() { rm -rf "$STAGE"; }
trap cleanup EXIT

# --- 1. the database, consistently ------------------------------------------------------
# VACUUM INTO asks SQLite itself for a coherent copy, WAL included. Copying the file while
# the api writes to it would back up a torn database.
# The mount is read-write on purpose: a database with a WAL cannot be opened read-only
# without write access to its side files. VACUUM INTO only reads the data itself.
docker run --rm \
  -v "$DATA_DIR:/data" -v "$STAGE:/stage" \
  --entrypoint python "$API_IMAGE" -c "
import sqlite3
source = sqlite3.connect('/data/$DB_NAME')
source.execute(\"VACUUM INTO '/stage/$DB_NAME'\")
source.close()
"

# --- 2. the keys ------------------------------------------------------------------------
# Without the server key, the agent zone of a restored vault can never be opened again.
if [ "$BACKUP_KEYS" = "true" ]; then
  mkdir -p "$STAGE/keys"
  chmod 700 "$STAGE/keys"
  for key in server totp; do
    [ -f "$KEYS_DIR/$key.key" ] && install -m 400 "$KEYS_DIR/$key.key" "$STAGE/keys/$key.key"
  done
fi

# --- 3. restic --------------------------------------------------------------------------
mounts=(-v "$STAGE:/backup:ro" -v "$RESTIC_PASSWORD_FILE:/run/restic-password:ro")
# On the VM restic runs as root; the drill runs it as the caller so that it can
# clean up its own temporary repository afterwards.
as_user=(${RESTIC_DOCKER_USER:+--user "$RESTIC_DOCKER_USER"})
# A local repository has to be mounted into the container; a remote one is reached over the
# network and needs no mount.
case "$RESTIC_REPOSITORY" in
  /*) mkdir -p "$RESTIC_REPOSITORY"
      mounts+=(-v "$RESTIC_REPOSITORY:/repo")
      REPO=/repo ;;
  *)  REPO="$RESTIC_REPOSITORY" ;;
esac

restic() {
  docker run --rm "${as_user[@]}" \
    -e HOME=/tmp \
    -e "RESTIC_REPOSITORY=$REPO" -e RESTIC_PASSWORD_FILE=/run/restic-password \
    "${mounts[@]}" "$RESTIC_IMAGE" "$@"
}

# First run: create the repository. `cat` on the config is the cheap way to ask "does it exist".
if ! restic cat config >/dev/null 2>&1; then
  echo "backup: creating the repository"
  restic init
fi

restic backup /backup --host serenity --tag serenity
restic forget --tag serenity \
  --keep-daily "$KEEP_DAILY" --keep-weekly "$KEEP_WEEKLY" --keep-monthly "$KEEP_MONTHLY" \
  --prune
echo "backup: done"
