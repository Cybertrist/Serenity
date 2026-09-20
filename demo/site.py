"""A toy website for the rotation executor: log in, change the password, log in again.

It exists so the agent can be watched doing its job end to end, and so CI can replay a real
rotation (browser included) on every commit. It is deliberately dumb: one account, in
memory, no database, standard library only. It is never part of the production stack
(compose profile "demo") and never reachable from outside the machine.
"""

import hashlib
import hmac
import html
import json
import os
import secrets
import struct
import time
from base64 import b32decode
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from urllib.parse import parse_qs, urlparse

USERNAME = os.environ.get("DEMO_USERNAME", "tristan@exemple.fr")
PASSWORD = os.environ.get("DEMO_PASSWORD", "mot-de-passe-de-depart")
# Base32, as a real site would print under its QR code. Empty disables the second step.
TOTP_SECRET = os.environ.get("DEMO_TOTP_SECRET", "")
PORT = int(os.environ.get("DEMO_PORT", "8000"))
MIN_LENGTH = 12

state = {"password": PASSWORD, "changes": 0}
sessions: set[str] = set()


def totp_code(secret: str, when: float) -> str:
    key = b32decode(secret.upper() + "=" * (-len(secret) % 8))
    digest = hmac.new(key, struct.pack(">Q", int(when // 30)), hashlib.sha1).digest()
    offset = digest[-1] & 0x0F
    code = struct.unpack(">I", digest[offset : offset + 4])[0] & 0x7FFFFFFF
    return f"{code % 1_000_000:06d}"


def totp_ok(code: str) -> bool:
    now = time.time()
    return any(hmac.compare_digest(totp_code(TOTP_SECRET, now + drift), code) for drift in (-30, 0))


PAGE = """<!doctype html>
<html lang="fr"><head><meta charset="utf-8"><title>Démo : {title}</title>
<style>
 body {{ font-family: system-ui, sans-serif; margin: 0; background: #f4f4f2; color: #16171a; }}
 main {{ max-width: 420px; margin: 8vh auto; background: #fff; border-radius: 14px; padding: 28px;
         box-shadow: 0 10px 40px -20px rgba(0,0,0,.4); }}
 h1 {{ font-size: 20px; margin: 0 0 18px; }}
 label {{ display: block; font-size: 13px; margin: 14px 0 4px; }}
 input {{ width: 100%; box-sizing: border-box; padding: 10px; font-size: 15px;
          border: 1px solid #d5d5d2; border-radius: 8px; }}
 button {{ margin-top: 18px; width: 100%; padding: 11px; font-size: 15px; border: 0;
           border-radius: 8px; background: #16171a; color: #fff; cursor: pointer; }}
 .error {{ margin-top: 14px; color: #b3261e; font-size: 14px; }}
 .ok {{ margin-top: 14px; color: #1b8553; font-size: 14px; }}
</style></head><body><main>{body}</main></body></html>
"""

LOGIN_FORM = """<h1>Connexion</h1>
<form method="post" action="/connexion">
  <label for="username">Identifiant</label>
  <input id="username" name="username" autocomplete="username">
  <label for="password">Mot de passe</label>
  <input id="password" name="password" type="password" autocomplete="current-password">
  {totp}
  <button type="submit" id="login">Se connecter</button>
</form>{message}"""

TOTP_FIELD = """<label for="totp">Code à 6 chiffres</label>
  <input id="totp" name="totp" inputmode="numeric" autocomplete="one-time-code">"""

CHANGE_FORM = """<h1>Mon compte</h1>
<p id="signed-in">Connecté en tant que {username}.</p>
<form method="post" action="/mot-de-passe">
  <label for="current">Mot de passe actuel</label>
  <input id="current" name="current" type="password" autocomplete="current-password">
  <label for="new">Nouveau mot de passe</label>
  <input id="new" name="new" type="password" autocomplete="new-password">
  <label for="confirm">Confirmation</label>
  <input id="confirm" name="confirm" type="password" autocomplete="new-password">
  <button type="submit" id="change">Changer le mot de passe</button>
</form>{message}"""


class Handler(BaseHTTPRequestHandler):
    server_version = "DemoSite/1.0"

    def log_message(self, fmt: str, *args: object) -> None:
        # Never log a form body: it carries passwords.
        print(f"demo: {self.command} {urlparse(self.path).path} -> {args[1] if args else ''}")

    # --- helpers ---------------------------------------------------------------------

    def _session(self) -> str | None:
        raw = self.headers.get("Cookie", "")
        for part in raw.split(";"):
            name, _, value = part.strip().partition("=")
            if name == "demo_session" and value in sessions:
                return value
        return None

    def _send(self, status: int, title: str, body: str, cookie: str | None = None) -> None:
        page = PAGE.format(title=title, body=body).encode("utf-8")
        self.send_response(status)
        self.send_header("Content-Type", "text/html; charset=utf-8")
        self.send_header("Content-Length", str(len(page)))
        if cookie is not None:
            self.send_header("Set-Cookie", f"demo_session={cookie}; Path=/; HttpOnly; SameSite=Lax")
        self.end_headers()
        self.wfile.write(page)

    def _redirect(self, to: str, cookie: str | None = None) -> None:
        self.send_response(303)
        self.send_header("Location", to)
        if cookie is not None:
            self.send_header("Set-Cookie", f"demo_session={cookie}; Path=/; HttpOnly; SameSite=Lax")
        self.end_headers()

    def _form(self) -> dict[str, str]:
        length = int(self.headers.get("Content-Length", "0"))
        raw = self.rfile.read(length).decode("utf-8")
        return {k: v[0] for k, v in parse_qs(raw, keep_blank_values=True).items()}

    def _login_page(self, message: str = "", status: int = 200) -> None:
        body = LOGIN_FORM.format(totp=TOTP_FIELD if TOTP_SECRET else "", message=message)
        self._send(status, "Connexion", body)

    # --- routes ----------------------------------------------------------------------

    def do_GET(self) -> None:  # noqa: N802 (http.server API)
        path = urlparse(self.path).path
        if path == "/sante":
            payload = json.dumps({"status": "ok", "changes": state["changes"]}).encode()
            self.send_response(200)
            self.send_header("Content-Type", "application/json")
            self.send_header("Content-Length", str(len(payload)))
            self.end_headers()
            self.wfile.write(payload)
        elif path in ("/", "/connexion"):
            self._login_page()
        elif path == "/compte":
            if self._session() is None:
                self._redirect("/connexion")
                return
            self._send(200, "Mon compte", CHANGE_FORM.format(username=html.escape(USERNAME), message=""))
        else:
            self._send(404, "Introuvable", "<h1>Introuvable</h1>")

    def do_POST(self) -> None:  # noqa: N802 (http.server API)
        path = urlparse(self.path).path
        form = self._form()
        if path == "/connexion":
            ok = form.get("username", "") == USERNAME and hmac.compare_digest(
                form.get("password", ""), str(state["password"])
            )
            if ok and TOTP_SECRET:
                ok = totp_ok(form.get("totp", ""))
            if not ok:
                self._login_page('<p class="error">Identifiants incorrects.</p>', status=401)
                return
            token = secrets.token_urlsafe(16)
            sessions.add(token)
            self._redirect("/compte", cookie=token)
        elif path == "/__test/reset":
            # The toy goes back to its starting password, so a test suite can replay.
            state["password"] = PASSWORD
            state["changes"] = 0
            sessions.clear()
            self._send(200, "Remise à zéro", "<h1>Remise à zéro</h1>")
        elif path == "/mot-de-passe":
            if self._session() is None:
                self._redirect("/connexion")
                return
            error = self._password_error(form)
            if error:
                body = CHANGE_FORM.format(
                    username=html.escape(USERNAME), message=f'<p class="error">{error}</p>'
                )
                self._send(400, "Mon compte", body)
                return
            state["password"] = form["new"]
            state["changes"] = int(state["changes"]) + 1
            sessions.clear()  # a real site logs the other sessions out
            body = CHANGE_FORM.format(
                username=html.escape(USERNAME),
                message='<p class="ok" id="changed">Mot de passe changé.</p>',
            )
            self._send(200, "Mon compte", body)
        else:
            self._send(404, "Introuvable", "<h1>Introuvable</h1>")

    def _password_error(self, form: dict[str, str]) -> str:
        if not hmac.compare_digest(form.get("current", ""), str(state["password"])):
            return "Mot de passe actuel incorrect."
        if len(form.get("new", "")) < MIN_LENGTH:
            return f"Le nouveau mot de passe fait moins de {MIN_LENGTH} caractères."
        if form.get("new") != form.get("confirm"):
            return "Les deux nouveaux mots de passe diffèrent."
        return ""


def main() -> None:
    server = ThreadingHTTPServer(("0.0.0.0", PORT), Handler)  # noqa: S104 (container-only)
    print(f"demo: site on :{PORT}, user {USERNAME}, totp {'on' if TOTP_SECRET else 'off'}")
    server.serve_forever()


if __name__ == "__main__":
    main()
