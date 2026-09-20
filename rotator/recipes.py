"""Site recipes: where the fields are, and what proves a step worked.

One JSON file per site in `recipes/`. Adding a site is a recipe, not code. A recipe is
validated field by field at start-up: a typo must fail loudly at boot, never half-way
through a rotation with a browser already logged in.
"""

import json
import os
import re
from dataclasses import dataclass
from pathlib import Path
from urllib.parse import urlsplit, urlunsplit

RECIPES_DIR = Path(os.environ.get("SERENITY_RECIPES_DIR", "/app/recipes"))

_DOMAIN = re.compile(r"^(?=.{1,253}$)([a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,63}$")
_NAME = re.compile(r"^[a-z0-9][a-z0-9-]{0,62}$")
REQUIRED_SELECTORS = ("username", "password", "submit", "current", "new", "change_submit")
OPTIONAL_SELECTORS = ("totp", "confirm")


class RecipeError(ValueError):
    """A recipe file is malformed. Refusing it is the point."""


@dataclass(frozen=True)
class Recipe:
    name: str
    domains: frozenset[str]
    login_path: str
    account_path: str
    selectors: dict[str, str]
    signed_in: str
    changed: str

    def url(self, base_url: str, path: str) -> str:
        """Keep the scheme and host of the entry's URL; the recipe owns the path only."""
        parts = urlsplit(base_url)
        if parts.scheme not in ("http", "https") or not parts.hostname:
            raise RecipeError("base_url must be http(s) with a host")
        return urlunsplit((parts.scheme, parts.netloc, path, "", ""))


def _text(data: dict[str, object], key: str, pattern: re.Pattern[str] | None = None) -> str:
    value = data.get(key)
    if not isinstance(value, str) or not value.strip():
        raise RecipeError(f"{key}: expected a non-empty string")
    if pattern and not pattern.match(value):
        raise RecipeError(f"{key}: invalid value")
    return value


def parse_recipe(data: object) -> Recipe:
    if not isinstance(data, dict):
        raise RecipeError("a recipe is a JSON object")
    unknown = set(data) - {
        "name",
        "domains",
        "login_path",
        "account_path",
        "selectors",
        "signed_in",
        "changed",
    }
    if unknown:
        raise RecipeError(f"unknown keys: {', '.join(sorted(unknown))}")

    raw_domains = data.get("domains")
    if not isinstance(raw_domains, list) or not raw_domains:
        raise RecipeError("domains: expected a non-empty list")
    domains = set()
    for domain in raw_domains:
        if not isinstance(domain, str) or not _DOMAIN.match(domain.lower()):
            raise RecipeError(f"domains: invalid domain {domain!r}")
        domains.add(domain.lower())

    raw_selectors = data.get("selectors")
    if not isinstance(raw_selectors, dict):
        raise RecipeError("selectors: expected an object")
    selectors: dict[str, str] = {}
    for key, value in raw_selectors.items():
        if key not in REQUIRED_SELECTORS + OPTIONAL_SELECTORS:
            raise RecipeError(f"selectors: unknown field {key!r}")
        if not isinstance(value, str) or not value.strip():
            raise RecipeError(f"selectors.{key}: expected a non-empty string")
        selectors[key] = value
    missing = [key for key in REQUIRED_SELECTORS if key not in selectors]
    if missing:
        raise RecipeError(f"selectors: missing {', '.join(missing)}")

    for key in ("login_path", "account_path"):
        if not str(data.get(key, "")).startswith("/"):
            raise RecipeError(f"{key}: must start with /")

    return Recipe(
        name=_text(data, "name", _NAME),
        domains=frozenset(domains),
        login_path=_text(data, "login_path"),
        account_path=_text(data, "account_path"),
        selectors=selectors,
        signed_in=_text(data, "signed_in"),
        changed=_text(data, "changed"),
    )


def load_recipes(directory: Path | None = None) -> dict[str, Recipe]:
    folder = directory or RECIPES_DIR
    recipes: dict[str, Recipe] = {}
    for path in sorted(folder.glob("*.json")):
        try:
            recipe = parse_recipe(json.loads(path.read_text(encoding="utf-8")))
        except (json.JSONDecodeError, RecipeError) as exc:
            raise RecipeError(f"{path.name}: {exc}") from None
        if recipe.name in recipes:
            raise RecipeError(f"{path.name}: duplicate recipe name {recipe.name!r}")
        recipes[recipe.name] = recipe
    return recipes
