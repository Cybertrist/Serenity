"""Generate docs/api.md from the OpenAPI schema: python -m serenity.apidoc [--check] PATH.

The interactive docs are disabled in production; this Markdown page is the reference.
`--check` fails if the page is out of date (used by the CI).
"""

import sys
from collections.abc import Iterator
from pathlib import Path
from typing import Any

import nacl.utils

from serenity.config import Settings
from serenity.main import create_app

# French description of every route. `render` fails if one is missing.
ROLES = {
    "GET /api/health": "Healthcheck (Docker)",
    "GET /api/crypto/server-key": "Clé publique du serveur, pour sceller la clé d'agent",
    "GET /api/auth/status": "Les inscriptions sont-elles ouvertes ?",
    "POST /api/auth/signup": "Création du compte (blocs chiffrés) ; renvoie le TOTP à enrôler",
    "POST /api/auth/signup/confirm": "Activation par le premier code TOTP ; ouvre la session",
    "POST /api/auth/prelogin": "Sel et paramètres Argon2id (faux sel stable si compte inconnu)",
    "POST /api/auth/login": "Connexion : clé d'auth + TOTP, session d'appareil de 60 jours",
    "POST /api/auth/unlock": "Déverrouillage : clé d'auth seule, 15 min glissantes",
    "POST /api/auth/lock": "Verrouiller cet appareil",
    "POST /api/auth/logout": "Déconnecter cet appareil",
    "GET /api/auth/me": "Compte et session en cours",
    "GET /api/auth/keys": "Clés du compte, chiffrées (UK par MEK, AK par UK)",
    "GET /api/auth/sessions": "Appareils connectés",
    "DELETE /api/auth/sessions/{session_id}": "Déconnecter un appareil à distance",
    "POST /api/auth/password": "Changer le mot de passe maître (déconnecte les autres appareils)",
    "POST /api/auth/recover/start": "Récupération : clé de récupération + TOTP",
    "POST /api/auth/recover/complete": "Récupération : nouveau mot de passe maître et nouveau kit",
    "GET /api/logs": "Journal d'audit (le compte et le système)",
    "GET /api/vault/items": "Synchronisation : changements depuis un curseur",
    "POST /api/vault/items": "Ajout d'entrées chiffrées (zone personnelle), par lots",
    "PUT /api/vault/items/{item_id}": "Nouvelle révision (409 si modifiée ailleurs)",
    "DELETE /api/vault/items/{item_id}": "Mettre à la corbeille (30 jours)",
    "POST /api/vault/items/{item_id}/restore": "Sortir de la corbeille",
    "GET /api/vault/items/{item_id}/history": "10 dernières versions chiffrées",
    "POST /api/vault/items/{item_id}/delegate": (
        "Confier à l'agent (rechiffrée avec AK, confirmation)"
    ),
    "POST /api/vault/items/{item_id}/reclaim": "Reprendre (rechiffrée avec UK, confirmation)",
    "PUT /api/vault/items/{item_id}/policy": (
        "Fréquence et mode de rotation (rappels en zone personnelle)"
    ),
    "POST /api/watch/report": "Résultat d'un scan du navigateur (identifiants + types)",
    "GET /api/breaches": "Alertes de la veille",
    "POST /api/breaches/{breach_id}/dismiss": "Mettre une alerte de côté",
    "GET /api/watch/emails": "Adresses surveillées (HIBP)",
    "POST /api/watch/emails": "Ajouter une adresse surveillée",
    "DELETE /api/watch/emails/{email_id}": "Retirer une adresse surveillée",
    "GET /api/notifications": (
        "Notifications depuis un identifiant (interrogées par l'appli Android)"
    ),
    "POST /api/notifications/{notification_id}/read": "Marquer une notification comme lue",
    "POST /api/notifications/read-all": "Tout marquer comme lu",
    "GET /api/events": "Flux temps réel des notifications (Server-Sent Events)",
    "GET /api/agent/status": "Kill switch, allowlist, limite quotidienne, rotations en cours",
    "POST /api/agent/kill-switch": "Enclencher (session) ou relâcher (déverrouillé) le kill switch",
    "GET /api/agent/policies": "Politiques de rotation",
    "GET /api/agent/rotations": "Rotations en cours ou toutes",
    "POST /api/agent/rotations/{rotation_id}/approve": (
        "Approuver une rotation (kill switch, limite/jour)"
    ),
    "POST /api/agent/rotations/{rotation_id}/refuse": (
        "Refuser : prochaine échéance repoussée d'une période"
    ),
}

HEADER = """# API Serenity

> Page générée par `make api-doc` depuis le schéma OpenAPI : ne pas modifier à la main.

Toutes les routes sont sous `/api`, en JSON. **Accès** : *libre* (sans session), *session*
(session d'appareil de 60 jours), *déverrouillé* (mot de passe maître prouvé depuis moins de
15 min). Aucune réponse ne contient de secret en clair : les entrées et les clés sont des blocs
chiffrés (voir [`crypto.md`](crypto.md)).
"""


def _routes(routes: list[Any]) -> Iterator[Any]:
    # FastAPI >= 0.141 wraps included routers: walk down to the real routes.
    for route in routes:
        if hasattr(route, "original_router"):
            yield from _routes(route.original_router.routes)
        else:
            yield route


def _dependency_names(dependant: Any) -> Iterator[str]:
    for dependency in dependant.dependencies:
        yield getattr(dependency.call, "__name__", "")
        yield from _dependency_names(dependency)


def _access(app: Any, path: str, method: str) -> str:
    for route in _routes(app.routes):
        if getattr(route, "path", None) == path and method.upper() in getattr(route, "methods", ()):
            names = set(_dependency_names(route.dependant))
            if "require_unlocked" in names:
                return "déverrouillé"
            if "require_session" in names:
                return "session"
            return "libre"
    raise KeyError(f"{method} {path}")


def _schema_name(ref: dict[str, Any] | None) -> str:
    if not ref:
        return ""
    if "$ref" in ref:
        return "`" + str(ref["$ref"]).rsplit("/", 1)[1] + "`"
    if ref.get("type") == "array" and "items" in ref:
        return _schema_name(ref["items"]) + " (liste)"
    return ""


def render() -> str:
    settings = Settings(secret_key="apidoc-" + "k" * 40)  # type: ignore[arg-type]
    app = create_app(settings, totp_key=nacl.utils.random(32))
    spec = app.openapi()
    by_tag: dict[str, list[str]] = {}
    for path, methods in sorted(spec["paths"].items()):
        for method, op in methods.items():
            tag = (op.get("tags") or ["autres"])[0]
            body = (
                op.get("requestBody", {})
                .get("content", {})
                .get("application/json", {})
                .get("schema")
            )
            ok: dict[str, Any] = next(
                (r for code, r in op.get("responses", {}).items() if code.startswith("2")), {}
            )
            out = ok.get("content", {}).get("application/json", {}).get("schema")
            key = f"{method.upper()} {path}"
            if key not in ROLES:
                raise KeyError(f"no French description for {key}: add it to ROLES")
            summary = ROLES[key]
            by_tag.setdefault(tag, []).append(
                f"| `{method.upper()} {path}` | {_access(app, path, method)} | "
                f"{_schema_name(body)} | {_schema_name(out)} | {summary} |"
            )
    lines = [HEADER]
    for tag in sorted(by_tag):
        lines += [
            f"\n## {tag}\n",
            "| Route | Accès | Corps | Réponse | Rôle |",
            "|---|---|---|---|---|",
        ]
        lines += by_tag[tag]
    lines.append("\n## Schémas\n")
    for name, schema in sorted(spec.get("components", {}).get("schemas", {}).items()):
        props = schema.get("properties", {})
        if not props or name.startswith(("HTTPValidationError", "ValidationError")):
            continue
        fields = ", ".join(f"`{p}`" for p in props)
        lines.append(f"- **{name}** : {fields}")
    return "\n".join(lines) + "\n"


def main(argv: list[str]) -> int:
    check = "--check" in argv
    target = Path(next((a for a in argv if not a.startswith("--")), "../docs/api.md"))
    text = render()
    if check:
        if not target.exists() or target.read_text(encoding="utf-8") != text:
            print(f"{target} est à régénérer : make api-doc", file=sys.stderr)
            return 1
        return 0
    target.write_text(text, encoding="utf-8")
    print(f"écrit {target}")
    return 0


if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))
