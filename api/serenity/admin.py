"""Administration on the VM (root inside a container, then privileges are dropped):

    docker compose exec api python -m serenity.admin reset-totp <username>
    docker compose exec agent python -m serenity.admin watch-now

Resetting the login TOTP gives no access to the personal zone (docs/crypto.md §7.8).
`watch-now` runs the agent-zone watch immediately (it needs the server key: agent only).
"""

import argparse
import sys

import httpx
from sqlmodel import Session, select

from serenity import audit
from serenity.agent.rotations import run_schedule
from serenity.agent.watch import run_watch
from serenity.auth import sessions, totp
from serenity.auth.validation import InvalidInputError, normalize_username
from serenity.config import get_settings
from serenity.db import check_schema, create_db_engine
from serenity.models import Actor, User, UserStatus, utcnow
from serenity.secrets import drop_privileges, read_key_file
from serenity.watcher.hibp import Hibp
from serenity.watcher.pwned import PwnedPasswords


def reset_totp(username: str) -> int:
    settings = get_settings()
    totp_key = read_key_file(settings.totp_key_file)
    drop_privileges()
    engine = create_db_engine(settings.db_path)
    check_schema(engine)
    with Session(engine) as session:
        user = session.exec(
            select(User).where(User.username == username, User.status == UserStatus.ACTIVE)
        ).first()
        if user is None:
            print(f"Aucun compte actif « {username} ».", file=sys.stderr)
            return 1
        secret = totp.new_secret()
        user.totp_secret_enc = totp.encrypt_secret(totp_key, user.id, secret)
        user.totp_last_step = None
        user.updated_at = utcnow()
        session.add(user)
        session.commit()
        revoked = sessions.revoke_all(session, user.id)
        audit.record(
            session,
            Actor.SYSTEM,
            "admin.totp.reset",
            user_id=user.id,
            details={"revoked_sessions": revoked},
        )
    print("Nouveau TOTP. Ajoute-le dans ton appli d'authentification (ne le colle nulle part) :")
    print(f"  Clé : {secret}")
    print(f"  Lien : {totp.provisioning_uri(secret, username)}")
    print(f"{revoked} session(s) fermée(s).")
    return 0


def watch_now() -> int:
    settings = get_settings()
    server_key = read_key_file(settings.server_key_file)
    drop_privileges()
    engine = create_db_engine(settings.db_path)
    check_schema(engine)
    key = settings.hibp_api_key
    with httpx.Client(timeout=20) as http:
        hibp = Hibp(http, key.get_secret_value()) if key and key.get_secret_value() else None
        report = run_watch(engine, server_key, PwnedPasswords(http), hibp, utcnow())
    if report.skipped:
        print("Kill switch actif : veille non lancée.")
        return 1
    print(f"Veille terminée : {report.users} compte(s), {report.new_alerts} nouvelle(s) alerte(s).")
    print("E-mails : " + ("vérifiés (HIBP)" if hibp else "non vérifiés (pas de HIBP_API_KEY)"))
    return 0


def schedule_now() -> int:
    settings = get_settings()
    # Same privileges as the agent: read the server key as root (unused here), then drop.
    read_key_file(settings.server_key_file)
    drop_privileges()
    engine = create_db_engine(settings.db_path)
    check_schema(engine)
    with Session(engine) as session:
        report = run_schedule(session, utcnow())
    if report.skipped:
        print("Kill switch actif : aucune échéance traitée.")
        return 1
    print(
        f"Échéances : {report.scheduled} rotation(s) programmée(s), {report.reminders} rappel(s)."
    )
    return 0


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(prog="python -m serenity.admin")
    sub = parser.add_subparsers(dest="command", required=True)
    reset = sub.add_parser("reset-totp", help="replace the login TOTP of an account")
    reset.add_argument("username")
    sub.add_parser("watch-now", help="run the agent-zone watch now (agent container)")
    sub.add_parser("schedule-now", help="run the rotation due-date check now")
    args = parser.parse_args(argv)
    if args.command == "watch-now":
        return watch_now()
    if args.command == "schedule-now":
        return schedule_now()
    try:
        username = normalize_username(args.username)
    except InvalidInputError as exc:
        print(exc, file=sys.stderr)
        return 1
    return reset_totp(username)


if __name__ == "__main__":
    sys.exit(main())
