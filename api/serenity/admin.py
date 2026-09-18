"""Administration on the VM (root inside the api container):

    docker compose exec api python -m serenity.admin reset-totp <username>

Reads the TOTP key file as root, drops privileges, then acts on the database.
Resetting the login TOTP gives no access to the personal zone (docs/crypto.md §7.8).
"""

import argparse
import sys

from sqlmodel import Session, select

from serenity import audit
from serenity.auth import sessions, totp
from serenity.auth.validation import InvalidInputError, normalize_username
from serenity.config import get_settings
from serenity.db import check_schema, create_db_engine
from serenity.models import Actor, User, UserStatus, utcnow
from serenity.secrets import drop_privileges, read_key_file


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


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(prog="python -m serenity.admin")
    sub = parser.add_subparsers(dest="command", required=True)
    reset = sub.add_parser("reset-totp", help="replace the login TOTP of an account")
    reset.add_argument("username")
    args = parser.parse_args(argv)
    try:
        username = normalize_username(args.username)
    except InvalidInputError as exc:
        print(exc, file=sys.stderr)
        return 1
    return reset_totp(username)


if __name__ == "__main__":
    sys.exit(main())
