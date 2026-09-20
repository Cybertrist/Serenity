#!/usr/bin/env bash
# Restore a backup, and check it. Two modes:
#
#   ops/restore.sh --check [snapshot]        restore into a temporary directory and verify it
#   ops/restore.sh --into /some/dir [snap]   restore there, for a real recovery
#
# It never writes into a running stack: putting the files back in place is a deliberate,
# manual step, described in docs/09-sauvegardes.md. A restore that overwrites a live vault by
# accident is worse than no restore at all.
set -euo pipefail
cd "$(dirname "$0")/.."

RESTIC_IMAGE="${RESTIC_IMAGE:-restic/restic:0.18.1}"
API_IMAGE="${SERENITY_API_IMAGE:-serenity-api:local}"
DB_NAME="${SERENITY_DB_NAME:-serenity.sqlite}"

MODE="check"
TARGET=""
SNAPSHOT="latest"
while [ $# -gt 0 ]; do
  case "$1" in
    --check) MODE="check"; shift ;;
    --into) MODE="into"; TARGET="${2:?--into needs a directory}"; shift 2 ;;
    *) SNAPSHOT="$1"; shift ;;
  esac
done

if [ -f .env ] && [ -z "${RESTIC_REPOSITORY:-}" ]; then
  set -a
  # shellcheck disable=SC1091
  . ./.env
  set +a
fi
: "${RESTIC_REPOSITORY:?set RESTIC_REPOSITORY in .env}"
: "${RESTIC_PASSWORD_FILE:?set RESTIC_PASSWORD_FILE in .env}"

if [ "$MODE" = "check" ]; then
  TARGET="$(mktemp -d "${SERENITY_BACKUP_STAGE:-/tmp}/serenity-restore.XXXXXX")"
  trap 'rm -rf "$TARGET"' EXIT
fi
mkdir -p "$TARGET"
chmod 700 "$TARGET"

mounts=(-v "$TARGET:/restore" -v "$RESTIC_PASSWORD_FILE:/run/restic-password:ro")
# The drill runs as a plain user and has to be able to delete what it restored.
as_user=(${RESTIC_DOCKER_USER:+--user "$RESTIC_DOCKER_USER"})
case "$RESTIC_REPOSITORY" in
  /*) mounts+=(-v "$RESTIC_REPOSITORY:/repo"); REPO=/repo ;;
  *)  REPO="$RESTIC_REPOSITORY" ;;
esac

restic() {
  docker run --rm "${as_user[@]}" \
    -e HOME=/tmp \
    -e "RESTIC_REPOSITORY=$REPO" -e RESTIC_PASSWORD_FILE=/run/restic-password \
    "${mounts[@]}" "$RESTIC_IMAGE" "$@"
}

restic restore "$SNAPSHOT" --target /restore >/dev/null
DB="$(find "$TARGET" -name "$DB_NAME" -print -quit)"
[ -n "$DB" ] || { echo "restore: no $DB_NAME in the snapshot" >&2; exit 1; }

# A file that restores is not a backup: it has to open, pass SQLite's own integrity check,
# and still hold the accounts and the vault.
docker run --rm -v "$(dirname "$DB"):/restored:ro" --entrypoint python "$API_IMAGE" -c "
import sqlite3, sys
db = sqlite3.connect('file:/restored/$DB_NAME?mode=ro', uri=True)
status = db.execute('PRAGMA integrity_check').fetchone()[0]
if status != 'ok':
    print('restore: integrity check failed:', status, file=sys.stderr)
    raise SystemExit(1)
tables = {r[0] for r in db.execute(\"SELECT name FROM sqlite_master WHERE type='table'\")}
missing = {'user', 'item', 'agent_key', 'setting'} - {t.lower() for t in tables}
if missing:
    print('restore: missing tables:', ', '.join(sorted(missing)), file=sys.stderr)
    raise SystemExit(1)
users = db.execute('SELECT count(*) FROM user').fetchone()[0]
items = db.execute('SELECT count(*) FROM item').fetchone()[0]
version = db.execute(\"SELECT value FROM setting WHERE key='schema_version'\").fetchone()
print(f'restore: base saine — {users} compte(s), {items} entrée(s), schéma {version[0] if version else \"?\"}')
"

if [ "$MODE" = "check" ]; then
  echo "restore: vérification réussie (rien n'a été écrit hors du dossier temporaire)"
else
  echo "restore: fichiers dans $TARGET"
  echo "Remise en place : docs/09-sauvegardes.md (stack arrêtée, droits à refaire)."
fi
