"""Command-line client for manual tests on the VM, and reference client for the API tests.

It does exactly what the web app will do (docs/crypto.md §7), in Python:
    python -m serenity.devclient signup|login|unlock|lock|me|sessions|logout|password|recover

Keys (MK, UK, AK...) only live in memory during one command. The state file only keeps
the session cookie and the username.
"""

import argparse
import getpass
import json
import os
import sys
import uuid
from dataclasses import dataclass
from pathlib import Path
from typing import Any

import httpx
import nacl.utils

from serenity.auth.validation import InvalidInputError, normalize_username
from serenity.crypto import blocks, contexts, kdf, recovery, sealed
from serenity.crypto.encoding import b64url_decode as d
from serenity.crypto.encoding import b64url_encode as e

COOKIE = "serenity_session"


class ApiError(RuntimeError):
    def __init__(self, status: int, detail: str) -> None:
        super().__init__(f"HTTP {status} : {detail}")
        self.status = status


@dataclass
class Keyring:
    """What an unlocked client holds in memory."""

    user_id: str
    uk: bytes
    ak: bytes
    ak_version: int

    def __repr__(self) -> str:
        return f"Keyring(user_id={self.user_id!r})"


@dataclass(frozen=True)
class NewPassword:
    body: dict[str, Any]
    auth_key: bytes


class Client:
    def __init__(self, http: httpx.Client, token: str | None = None) -> None:
        self.http = http
        self.token = token

    # --- transport -------------------------------------------------------------------

    def call(self, method: str, path: str, body: Any = None) -> Any:
        headers = {"Cookie": f"{COOKIE}={self.token}"} if self.token else {}
        response = self.http.request(method, path, json=body, headers=headers)
        # The cookie is Secure: handled by hand so plain http works inside the container.
        for name, value in response.cookies.items():
            if name == COOKIE:
                self.token = value or None
        if response.status_code >= 400:
            detail = response.json().get("detail", "") if response.content else ""
            raise ApiError(response.status_code, str(detail))
        return response.json() if response.content else None

    # --- helpers ---------------------------------------------------------------------

    @staticmethod
    def new_password(user_id: str, password: str, uk: bytes) -> NewPassword:
        salt = nacl.utils.random(kdf.SALT_BYTES)
        auth, mek = kdf.derive_login_keys(kdf.derive_master_key(password, salt))
        body = {
            "kdf": {"salt": e(salt), **_params(kdf.DEFAULT_PARAMS)},
            "auth_key": e(auth),
            "uk_by_mk": e(blocks.wrap_key(mek, uk, contexts.uk_by_mk(user_id))),
        }
        return NewPassword(body, auth)

    def derive(self, username: str, password: str) -> tuple[bytes, bytes]:
        """(AuthKey, MEK) after prelogin. Refuses parameters below the floor."""
        pre = self.call("POST", "/api/auth/prelogin", {"username": username})
        params = kdf.KdfParams(memlimit=pre["memlimit"], opslimit=pre["opslimit"])
        return kdf.derive_login_keys(kdf.derive_master_key(password, d(pre["salt"]), params))

    @staticmethod
    def unwrap(user_id: str, mek: bytes, login: dict[str, Any]) -> Keyring:
        uk = blocks.unwrap_key(mek, d(login["uk_by_mk"]), contexts.uk_by_mk(user_id))
        version = login["agent_key"]["version"]
        ak = blocks.unwrap_key(
            uk, d(login["agent_key"]["ak_by_uk"]), contexts.ak_by_uk(user_id, version)
        )
        return Keyring(user_id, uk, ak, version)

    # --- flows -----------------------------------------------------------------------

    def signup(self, username: str, password: str) -> dict[str, Any]:
        """§7.1 steps 1-7. Returns the TOTP enrolment data and the recovery kit text."""
        user_id = str(uuid.uuid4())
        uk, ak, rk = (
            nacl.utils.random(32),
            nacl.utils.random(32),
            nacl.utils.random(recovery.RK_BYTES),
        )
        rak, rwk = recovery.derive_recovery_keys(rk)
        server = self.call("GET", "/api/crypto/server-key")
        new = self.new_password(user_id, password, uk)
        body = {
            "user_id": user_id,
            "username": username,
            **new.body,
            "recovery_auth_key": e(rak),
            "uk_by_rk": e(blocks.wrap_key(rwk, uk, contexts.uk_by_rk(user_id))),
            "ak_by_uk": e(blocks.wrap_key(uk, ak, contexts.ak_by_uk(user_id, 1))),
            "ak_sealed": e(
                sealed.seal_for_server(d(server["public_key"]), ak, contexts.ak_by_sk(user_id, 1))
            ),
        }
        out: dict[str, Any] = self.call("POST", "/api/auth/signup", body)
        out["recovery_kit"] = recovery.encode_recovery_key(rk)
        return out

    def confirm(self, user_id: str, code: str) -> dict[str, Any]:
        result: dict[str, Any] = self.call(
            "POST", "/api/auth/signup/confirm", {"user_id": user_id, "totp": code}
        )
        return result

    def login(self, username: str, password: str, code: str) -> Keyring:
        auth, mek = self.derive(username, password)
        out = self.call(
            "POST", "/api/auth/login", {"username": username, "auth_key": e(auth), "totp": code}
        )
        return self.unwrap(out["user_id"], mek, out)

    def unlock(self, username: str, password: str) -> dict[str, Any]:
        auth, _ = self.derive(username, password)
        result: dict[str, Any] = self.call("POST", "/api/auth/unlock", {"auth_key": e(auth)})
        return result

    def keys(self, mek: bytes) -> Keyring:
        """Unwrap UK and AK from the encrypted keys of this device session (§7.3)."""
        state = self.call("GET", "/api/auth/keys")
        return self.unwrap(state["user_id"], mek, state)

    def change_password(self, username: str, current: str, new_password: str, code: str) -> None:
        """§7.7: same UK, new salt, new AuthKey, new wrapping. Entries are not touched."""
        auth, mek = self.derive(username, current)
        self.call("POST", "/api/auth/unlock", {"auth_key": e(auth)})
        keys = self.keys(mek)
        new = self.new_password(keys.user_id, new_password, keys.uk)
        self.call(
            "POST",
            "/api/auth/password",
            {"current_auth_key": e(auth), "totp": code, "new": new.body},
        )

    def recover(self, username: str, kit: str, code: str, new_password: str) -> str:
        """§7.8. Returns the NEW recovery kit text."""
        rak, rwk = recovery.derive_recovery_keys(recovery.decode_recovery_key(kit))
        start = self.call(
            "POST",
            "/api/auth/recover/start",
            {"username": username, "recovery_auth_key": e(rak), "totp": code},
        )
        user_id = start["user_id"]
        uk = blocks.unwrap_key(rwk, d(start["uk_by_rk"]), contexts.uk_by_rk(user_id))
        new = self.new_password(user_id, new_password, uk)
        rk2 = nacl.utils.random(recovery.RK_BYTES)
        rak2, rwk2 = recovery.derive_recovery_keys(rk2)
        self.call(
            "POST",
            "/api/auth/recover/complete",
            {
                "ticket": start["ticket"],
                "new": new.body,
                "recovery_auth_key": e(rak2),
                "uk_by_rk": e(blocks.wrap_key(rwk2, uk, contexts.uk_by_rk(user_id))),
            },
        )
        return recovery.encode_recovery_key(rk2)


def _params(params: kdf.KdfParams) -> dict[str, int]:
    return {"memlimit": params.memlimit, "opslimit": params.opslimit}


# --- command line --------------------------------------------------------------------

STATE = Path(os.environ.get("SERENITY_DEVCLIENT_STATE", "/tmp/serenity-devclient.json"))  # noqa: S108


def _load() -> dict[str, Any]:
    try:
        data: dict[str, Any] = json.loads(STATE.read_text())
        return data
    except (FileNotFoundError, json.JSONDecodeError):
        return {}


def _save(state: dict[str, Any]) -> None:
    fd = os.open(STATE, os.O_WRONLY | os.O_CREAT | os.O_TRUNC, 0o600)
    with os.fdopen(fd, "w") as f:
        json.dump(state, f)


def _ask_password(prompt: str = "Mot de passe maître : ", confirm: bool = False) -> str:
    password = getpass.getpass(prompt)
    if confirm and getpass.getpass("Confirme : ") != password:
        raise SystemExit("Les deux saisies diffèrent.")
    return password


def _ask_username() -> str:
    """Check the identifier before asking for the master password."""
    while True:
        try:
            return normalize_username(input("Identifiant : "))
        except InvalidInputError as exc:
            print(f"Identifiant refusé : {exc}")


def _print_json(data: Any) -> None:
    print(json.dumps(data, ensure_ascii=False, indent=2))


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(prog="python -m serenity.devclient")
    parser.add_argument(
        "command",
        choices=[
            "signup",
            "login",
            "unlock",
            "lock",
            "me",
            "sessions",
            "logout",
            "password",
            "recover",
        ],
    )
    parser.add_argument("--url", default=os.environ.get("SERENITY_URL", "http://127.0.0.1:8000"))
    args = parser.parse_args(argv)
    state = _load()
    client = Client(httpx.Client(base_url=args.url, timeout=30), state.get("token"))
    try:
        if args.command == "signup":
            username = _ask_username()
            password = _ask_password(confirm=True)
            out = client.signup(username, password)
            print("\nAjoute Serenity dans ton appli d'authentification (saisie manuelle, TOTP) :")
            print(f"  Clé : {out['totp_secret']}")
            print("  (ne colle jamais cette clé dans une conversation)\n")
            code = input("Code à 6 chiffres : ").strip()
            client.confirm(out["user_id"], code)
            print("\nKit de récupération (à noter sur papier, il ne sera plus affiché) :")
            print(f"  {out['recovery_kit']}\n")
            state["username"] = username
        elif args.command == "login":
            username = _ask_username()
            password = _ask_password()
            keys = client.login(username, password, input("Code TOTP : ").strip())
            print(f"Connecté. Clés déchiffrées en mémoire (UK, AK v{keys.ak_version}).")
            state["username"] = username
        elif args.command == "unlock":
            _print_json(client.unlock(state["username"], _ask_password()))
        elif args.command == "lock":
            client.call("POST", "/api/auth/lock")
            print("Verrouillé.")
        elif args.command == "me":
            _print_json(client.call("GET", "/api/auth/me"))
        elif args.command == "sessions":
            _print_json(client.call("GET", "/api/auth/sessions"))
        elif args.command == "logout":
            client.call("POST", "/api/auth/logout")
            client.token = None
            print("Déconnecté.")
        elif args.command == "password":
            current = _ask_password("Mot de passe maître actuel : ")
            new = _ask_password("Nouveau mot de passe maître : ", confirm=True)
            client.change_password(state["username"], current, new, input("Code TOTP : ").strip())
            print("Mot de passe maître changé. Les autres appareils sont déconnectés.")
        elif args.command == "recover":
            username = _ask_username()
            kit = getpass.getpass("Clé de récupération : ")
            code = input("Code TOTP : ").strip()
            new = _ask_password("Nouveau mot de passe maître : ", confirm=True)
            new_kit = client.recover(username, kit, code, new)
            print("\nNouveau kit de récupération (l'ancien ne marche plus) :")
            print(f"  {new_kit}\n")
            state["username"] = username
    except ApiError as exc:
        print(f"Erreur : {exc}", file=sys.stderr)
        return 1
    except KeyError:
        print("Connecte-toi d'abord : python -m serenity.devclient login", file=sys.stderr)
        return 1
    finally:
        state["token"] = client.token
        _save(state)
    return 0


if __name__ == "__main__":
    sys.exit(main())
