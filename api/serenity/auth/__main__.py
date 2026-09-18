"""Command line: `python -m serenity.auth init [--force]`.

Creates the single user's credentials (password + TOTP), interactively.
"""

import argparse
import getpass
import sys
import time

from sqlmodel import Session

from serenity import audit
from serenity.auth import credentials
from serenity.config import get_settings
from serenity.db import create_db_engine, init_db
from serenity.models import Actor


def _ask_password() -> str:
    while True:
        password = getpass.getpass("Mot de passe Serenity : ")
        if len(password) < credentials.MIN_PASSWORD_LENGTH:
            print(f"Au moins {credentials.MIN_PASSWORD_LENGTH} caractères, recommence.")
            continue
        if getpass.getpass("Confirme le mot de passe : ") != password:
            print("Les deux saisies diffèrent, recommence.")
            continue
        return password


def _enroll_totp() -> str:
    secret = credentials.new_totp_secret()
    print("\nAjoute Serenity dans ton application d'authentification (saisie manuelle) :")
    print(f"  Compte : Serenity\n  Clé    : {secret}\n  Type   : basé sur le temps (TOTP)")
    print(f"\nOu ce lien otpauth :\n  {credentials.provisioning_uri(secret)}\n")
    probe = credentials.Credentials(password_hash="", totp_secret=secret)
    for _ in range(3):
        code = input("Code à 6 chiffres affiché par l'application : ")
        if credentials.totp_step(probe, code, None, time.time()) is not None:
            return secret
        print("Code incorrect.")
    raise SystemExit("Échec de la vérification TOTP, rien n'a été enregistré.")


def init(force: bool) -> int:
    settings = get_settings()
    if settings.auth_file.exists() and not force:
        print(f"{settings.auth_file} existe déjà. Utilise --force pour le remplacer.")
        return 1
    password = _ask_password()
    secret = _enroll_totp()
    credentials.save_credentials(
        settings.auth_file, credentials.create_credentials(password, secret)
    )

    engine = create_db_engine(settings.db_path)
    init_db(engine)
    with Session(engine) as session:
        audit.record(session, Actor.USER, "auth.init", details={"replaced": force})
    print("Identifiants enregistrés. Tu peux te connecter.")
    return 0


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(prog="python -m serenity.auth")
    sub = parser.add_subparsers(dest="command", required=True)
    init_parser = sub.add_parser("init", help="create the password and TOTP of the user")
    init_parser.add_argument("--force", action="store_true", help="replace existing credentials")
    args = parser.parse_args(argv)
    return init(force=args.force)


if __name__ == "__main__":
    sys.exit(main())
