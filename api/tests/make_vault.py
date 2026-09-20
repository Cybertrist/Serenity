"""Build a throwaway vault on disk: one account, one entry in each zone.

Only used by the backup drill (`scripts/backup-drill.sh`), which needs a real database to
back up and restore. Everything here is throwaway: the password below opens nothing.
"""

import sys
from pathlib import Path

import nacl.utils
from fastapi.testclient import TestClient
from sqlmodel import Session

from serenity.agent.service import publish_server_key
from serenity.config import Settings
from serenity.devclient import Client
from serenity.main import create_app
from serenity.models import utcnow

PASSWORD = "une phrase de passe jetable"
USERNAME = "exercice"


def build(db_path: Path) -> None:
    db_path.parent.mkdir(parents=True, exist_ok=True)
    settings = Settings(
        secret_key="d" * 48,  # type: ignore[arg-type]
        db_path=db_path,
        auth_hash_memlimit=8 * 1024 * 1024,
        auth_hash_opslimit=1,
    )
    app = create_app(settings, totp_key=nacl.utils.random(32))
    with TestClient(app, base_url="https://testserver") as client:
        with Session(client.app.state.engine) as db:  # type: ignore[attr-defined]
            publish_server_key(db, nacl.utils.random(32), utcnow())
        api = Client(client)
        out = api.signup(USERNAME, PASSWORD)
        import pyotp

        api.confirm(out["user_id"], pyotp.TOTP(out["totp_secret"]).now())
        _, mek = api.derive(USERNAME, PASSWORD)
        keys = api.keys(mek)
        personal = {
            "v": 1,
            "type": "login",
            "name": "Banque",
            "username": "exercice",
            "password": "mot-de-passe-jetable-1",
        }
        agent = {
            "v": 1,
            "type": "login",
            "name": "Démo",
            "username": "exercice",
            "password": "mot-de-passe-jetable-2",
            "urls": ["https://demo.serenity.test/connexion"],
        }
        api.add(keys, personal)
        api.move(keys, api.add(keys, agent), "agent")
    print(f"vault: {db_path} prêt (1 compte, 2 entrées)")


if __name__ == "__main__":
    build(Path(sys.argv[1]))
