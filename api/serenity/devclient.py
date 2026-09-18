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
from serenity.crypto import blocks, contexts, items, kdf, recovery, sealed
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

    # --- vault (docs/crypto.md §7.4 to §7.6) -----------------------------------------

    @staticmethod
    def _key(keys: Keyring, zone: str) -> bytes:
        return keys.uk if zone == "personal" else keys.ak

    def sync(self, since: int = 0) -> dict[str, Any]:
        result: dict[str, Any] = self.call("GET", f"/api/vault/items?since={since}")
        return result

    def decrypt(self, keys: Keyring, item: dict[str, Any]) -> dict[str, Any]:
        ctx = contexts.item(keys.user_id, item["id"], item["zone"], item["revision"])
        return items.decrypt_item(self._key(keys, item["zone"]), d(item["block"]), ctx)

    def add(self, keys: Keyring, entry: dict[str, Any]) -> dict[str, Any]:
        """New entry, always in the personal zone, revision 1."""
        item_id = str(uuid.uuid4())
        block = items.encrypt_item(
            keys.uk, entry, contexts.item(keys.user_id, item_id, "personal", 1)
        )
        created = self.call(
            "POST", "/api/vault/items", {"items": [{"id": item_id, "block": e(block)}]}
        )
        result: dict[str, Any] = created[0]
        return result

    def _reencrypt(
        self, keys: Keyring, item: dict[str, Any], entry: dict[str, Any], zone: str
    ) -> str:
        ctx = contexts.item(keys.user_id, item["id"], zone, item["revision"] + 1)
        return e(items.encrypt_item(self._key(keys, zone), entry, ctx))

    def edit(self, keys: Keyring, item: dict[str, Any], entry: dict[str, Any]) -> dict[str, Any]:
        body = {
            "base_revision": item["revision"],
            "block": self._reencrypt(keys, item, entry, item["zone"]),
        }
        result: dict[str, Any] = self.call("PUT", f"/api/vault/items/{item['id']}", body)
        return result

    def move(self, keys: Keyring, item: dict[str, Any], to_zone: str) -> dict[str, Any]:
        """Delegate (personal -> agent) or reclaim (agent -> personal): decrypt, re-encrypt."""
        entry = self.decrypt(keys, item)
        body = {
            "base_revision": item["revision"],
            "block": self._reencrypt(keys, item, entry, to_zone),
            "confirm": True,
        }
        action = "delegate" if to_zone == "agent" else "reclaim"
        result: dict[str, Any] = self.call("POST", f"/api/vault/items/{item['id']}/{action}", body)
        return result

    def trash(self, item: dict[str, Any]) -> dict[str, Any]:
        result: dict[str, Any] = self.call(
            "DELETE", f"/api/vault/items/{item['id']}?base_revision={item['revision']}"
        )
        return result

    def history(self, keys: Keyring, item_id: str) -> list[dict[str, Any]]:
        out = []
        for rev in self.call("GET", f"/api/vault/items/{item_id}/history"):
            ctx = contexts.item(keys.user_id, item_id, rev["zone"], rev["revision"])
            entry = items.decrypt_item(self._key(keys, rev["zone"]), d(rev["block"]), ctx)
            out.append({"revision": rev["revision"], "zone": rev["zone"], "entry": entry})
        return out


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


# --- vault commands --------------------------------------------------------------------


def _unlocked(client: Client, state: dict[str, Any]) -> Keyring:
    """Unlock with the master password, then unwrap UK and AK (nothing is stored)."""
    auth, mek = client.derive(state["username"], _ask_password())
    client.call("POST", "/api/auth/unlock", {"auth_key": e(auth)})
    return client.keys(mek)


def _find(
    client: Client, keys: Keyring, target: str | None
) -> tuple[dict[str, Any], dict[str, Any]]:
    if not target:
        raise SystemExit("Précise le nom ou l'identifiant de l'entrée.")
    for item in client.sync()["items"]:
        if item["block"] is None:
            continue
        entry = client.decrypt(keys, item)
        if target in (item["id"], entry["name"]):
            return item, entry
    raise SystemExit(f"Aucune entrée « {target} ».")


def _zone_label(zone: str) -> str:
    return "Protégé par toi" if zone == "personal" else "Confié à l'agent"


def _cmd_add(client: Client, state: dict[str, Any], _target: str | None) -> None:
    keys = _unlocked(client, state)
    name = input("Nom (ex. Netflix) : ").strip()
    username = input("Identifiant sur le site : ").strip()
    password = getpass.getpass("Mot de passe du site (vide = générer) : ")
    if not password:
        password = e(nacl.utils.random(15))
        print("Mot de passe généré (20 caractères).")
    url = input("Adresse (facultatif) : ").strip()
    entry = {
        "v": 1,
        "type": "login",
        "name": name,
        "username": username,
        "password": password,
        "urls": [url] if url else [],
    }
    item = client.add(keys, entry)
    print(f"Ajouté dans « {_zone_label(item['zone'])} » (id {item['id']}).")


def _cmd_list(client: Client, state: dict[str, Any], _target: str | None) -> None:
    keys = _unlocked(client, state)
    rows = [i for i in client.sync()["items"] if i["block"] is not None]
    for zone in ("personal", "agent"):
        print(f"\n{_zone_label(zone)}")
        for item in rows:
            if item["zone"] == zone and item["deleted_at"] is None:
                entry = client.decrypt(keys, item)
                login = entry.get("username", "")
                print(f"  - {entry['name']}  ({login}, révision {item['revision']})")
    trashed = [i for i in rows if i["deleted_at"]]
    if trashed:
        print(f"\nCorbeille : {len(trashed)} entrée(s)")


def _cmd_show(client: Client, state: dict[str, Any], target: str | None) -> None:
    keys = _unlocked(client, state)
    item, entry = _find(client, keys, target)
    shown = {**entry, "password": "•" * 8 if entry.get("password") else ""}
    _print_json({"zone": item["zone"], "revision": item["revision"], "entry": shown})


def _cmd_edit(client: Client, state: dict[str, Any], target: str | None) -> None:
    keys = _unlocked(client, state)
    item, entry = _find(client, keys, target)
    new = getpass.getpass("Nouveau mot de passe du site : ")
    updated = client.edit(keys, item, {**entry, "password": new})
    print(f"Révision {updated['revision']}.")


def _cmd_move(zone: str) -> Any:
    def run(client: Client, state: dict[str, Any], target: str | None) -> None:
        keys = _unlocked(client, state)
        item, entry = _find(client, keys, target)
        warning = (
            "L'agent pourra lire et changer ce mot de passe."
            if zone == "agent"
            else "L'agent ne pourra plus le lire. Change ensuite ce mot de passe : "
            "le serveur l'a connu."
        )
        if (
            input(f"{warning} Confirmer pour « {entry['name']} » ? (oui/non) ").strip().lower()
            != "oui"
        ):
            print("Annulé.")
            return
        moved = client.move(keys, item, zone)
        print(f"« {entry['name']} » : {_zone_label(moved['zone'])} (révision {moved['revision']}).")

    return run


def _cmd_delete(client: Client, state: dict[str, Any], target: str | None) -> None:
    keys = _unlocked(client, state)
    item, entry = _find(client, keys, target)
    client.trash(item)
    print(f"« {entry['name']} » est dans la corbeille (effacée dans 30 jours).")


def _cmd_restore(client: Client, state: dict[str, Any], target: str | None) -> None:
    keys = _unlocked(client, state)
    item, entry = _find(client, keys, target)
    client.call("POST", f"/api/vault/items/{item['id']}/restore")
    print(f"« {entry['name']} » est restaurée.")


def _cmd_history(client: Client, state: dict[str, Any], target: str | None) -> None:
    keys = _unlocked(client, state)
    item, _ = _find(client, keys, target)
    for rev in client.history(keys, item["id"]):
        print(f"  révision {rev['revision']} ({_zone_label(rev['zone'])})")


VAULT_COMMANDS = {
    "add": _cmd_add,
    "list": _cmd_list,
    "show": _cmd_show,
    "edit": _cmd_edit,
    "delegate": _cmd_move("agent"),
    "reclaim": _cmd_move("personal"),
    "delete": _cmd_delete,
    "restore": _cmd_restore,
    "history": _cmd_history,
}


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
            "add",
            "list",
            "show",
            "edit",
            "delegate",
            "reclaim",
            "delete",
            "restore",
            "history",
        ],
    )
    parser.add_argument("target", nargs="?", help="entry name or id (show, edit, delegate...)")
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
        elif args.command in VAULT_COMMANDS:
            VAULT_COMMANDS[args.command](client, state, args.target)
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
        print("Connecte-toi d'abord : make client c=login", file=sys.stderr)
        return 1
    finally:
        state["token"] = client.token
        _save(state)
    return 0


if __name__ == "__main__":
    sys.exit(main())
