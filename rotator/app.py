"""The only thing in Serenity that opens a browser and touches a website.

It is deliberately small and stupid: it knows how to fill two forms, following a recipe, and
says whether it worked. Everything that decides (kill switch, zone, allowlist, daily limit,
the transaction around the vault) stays in the agent (docs/crypto.md §7.12, ADR-015).

It never stores anything: no profile on disk, no cache between runs, no log of a body. The
passwords it receives live in memory for the length of one run.
"""

import logging
import os
from contextlib import asynccontextmanager
from typing import Annotated, AsyncIterator

from fastapi import FastAPI, Header, HTTPException, status
from playwright.async_api import Browser, Error as PlaywrightError, async_playwright
from pydantic import BaseModel, Field

from recipes import Recipe, load_recipes

logger = logging.getLogger("rotator")

TOKEN = os.environ.get("SERENITY_ROTATOR_TOKEN", "")
# One step (a click, a page load): a site that is slower than this is a failed rotation.
STEP_TIMEOUT_MS = int(os.environ.get("SERENITY_ROTATOR_STEP_TIMEOUT_MS", "15000"))

RECIPES: dict[str, Recipe] = {}
BROWSER: dict[str, Browser] = {}


@asynccontextmanager
async def lifespan(app: FastAPI) -> AsyncIterator[None]:
    RECIPES.update(load_recipes())
    logger.info("rotator: %d recipe(s) loaded", len(RECIPES))
    async with async_playwright() as play:
        BROWSER["chromium"] = await play.chromium.launch(args=["--no-sandbox"])
        try:
            yield
        finally:
            await BROWSER.pop("chromium").close()


app = FastAPI(title="Serenity rotator", lifespan=lifespan, docs_url=None, redoc_url=None)


class Credentials(BaseModel):
    recipe: str = Field(max_length=64)
    base_url: str = Field(max_length=2048)
    username: str = Field(max_length=320)
    password: str = Field(max_length=1024)
    totp: str | None = Field(default=None, max_length=8)

    def __repr__(self) -> str:  # a traceback must never print a password
        return f"Credentials(recipe={self.recipe!r}, username=<hidden>, password=<hidden>)"


class ChangeIn(Credentials):
    new_password: str = Field(min_length=12, max_length=1024)


class Result(BaseModel):
    ok: bool
    # Short, safe to store and to show: never carries a password or page content.
    error: str | None = None


def _check_token(header: str | None) -> None:
    if not TOKEN:
        raise HTTPException(status.HTTP_503_SERVICE_UNAVAILABLE, "rotator token not configured")
    if header != f"Bearer {TOKEN}":
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "bad token")


def _recipe(name: str) -> Recipe:
    recipe = RECIPES.get(name)
    if recipe is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "unknown recipe")
    return recipe


def _host_allowed(recipe: Recipe, base_url: str) -> bool:
    from urllib.parse import urlsplit

    host = (urlsplit(base_url).hostname or "").lower().rstrip(".")
    return any(host == d or host.endswith("." + d) for d in recipe.domains)


Token = Annotated[str | None, Header(alias="authorization")]


@app.get("/sante")
async def health() -> dict[str, object]:
    return {"status": "ok", "recipes": sorted(RECIPES)}


@app.get("/recettes")
async def recipes(authorization: Token = None) -> dict[str, object]:
    """What this executor knows how to drive. The agent picks the recipe from the entry's URL."""
    _check_token(authorization)
    return {
        "recipes": [
            {"name": r.name, "domains": sorted(r.domains)} for r in sorted(RECIPES.values(), key=lambda r: r.name)
        ]
    }


class InspectIn(BaseModel):
    """A page to look at. No credentials: this only reads what a form asks for."""

    url: str = Field(max_length=2048)


class Field_(BaseModel):
    selector: str
    tag: str
    type: str | None = None
    id: str | None = None
    name: str | None = None
    placeholder: str | None = None
    autocomplete: str | None = None
    label: str | None = None
    visible: bool = True


class Link(BaseModel):
    text: str
    href: str


class InspectOut(BaseModel):
    title: str
    url: str
    fields: list[Field_]
    buttons: list[Field_]
    links: list[Link] = []
    frames: int
    note: str | None = None


# What the browser is asked to report about a form. Kept in one place so the shape of the
# answer and the page stay in step.
_PROBE = """() => {
  const label = (el) => {
    if (el.labels && el.labels[0]) return el.labels[0].innerText.trim();
    const aria = el.getAttribute('aria-label');
    return aria ? aria.trim() : null;
  };
  const pick = (el) => {
    const box = el.getBoundingClientRect();
    const selector = el.id ? '#' + CSS.escape(el.id)
      : el.name ? el.tagName.toLowerCase() + '[name="' + el.name + '"]'
      : el.tagName.toLowerCase();
    return {
      selector,
      tag: el.tagName.toLowerCase(),
      type: el.getAttribute('type'),
      id: el.id || null,
      name: el.getAttribute('name'),
      placeholder: el.getAttribute('placeholder'),
      /* The standard hint: a serious site marks its password fields, and a recipe can follow. */
      autocomplete: el.getAttribute('autocomplete'),
      label: label(el) || (el.innerText || '').trim().slice(0, 60) || null,
      visible: box.width > 0 && box.height > 0,
    };
  };
  const fields = [...document.querySelectorAll('input, select, textarea')]
    .filter((el) => el.type !== 'hidden').map(pick);
  const buttons = [...document.querySelectorAll('button, input[type=submit], [role=button]')]
    .map(pick);
  /* Links are how you find the next page: sign in, my account, change my password. */
  const links = [...document.querySelectorAll('a[href]')]
    .map((el) => ({ text: (el.innerText || '').trim().slice(0, 60), href: el.href }))
    .filter((l) => l.text && !l.href.startsWith('javascript:'));
  return { title: document.title, url: location.href, fields, buttons, links,
           frames: document.querySelectorAll('iframe').length };
}"""


@app.post("/inspecter")
async def inspect(body: InspectIn, authorization: Token = None) -> InspectOut:
    """List the fields of a page, to write a recipe from what is there rather than from
    guesswork. Opens the page and reads it: nothing is typed, nothing is submitted."""
    _check_token(authorization)
    browser = BROWSER.get("chromium")
    if browser is None:
        raise HTTPException(status.HTTP_503_SERVICE_UNAVAILABLE, "navigateur indisponible")
    context = await browser.new_context(accept_downloads=False)
    context.set_default_timeout(STEP_TIMEOUT_MS)
    page = await context.new_page()
    try:
        await page.goto(body.url, wait_until="domcontentloaded")
        # A page built in the browser has nothing in it at `domcontentloaded`: its fields appear
        # once its own code has run. Waiting for a quiet network catches them, and a page that
        # never goes quiet is read anyway rather than making the inspection fail.
        try:
            await page.wait_for_load_state("networkidle", timeout=8000)
        except PlaywrightError:
            pass
        found = await page.evaluate(_PROBE)
    except PlaywrightError as exc:
        raise HTTPException(
            status.HTTP_502_BAD_GATEWAY, f"page illisible ({type(exc).__name__})"
        ) from None
    finally:
        await context.close()
    note = None
    if found["frames"]:
        note = "la page contient des cadres (iframe) : le formulaire est peut-être dedans"
    return InspectOut(**found, note=note)


@app.post("/verify")
async def verify(body: Credentials, authorization: Token = None) -> Result:
    """Log in from scratch. This is what proves a password works, before and after a change."""
    _check_token(authorization)
    recipe = _recipe(body.recipe)
    if not _host_allowed(recipe, body.base_url):
        return Result(ok=False, error="site hors du domaine de la recette")
    return await _run(recipe, body, change_to=None)


@app.post("/change")
async def change(body: ChangeIn, authorization: Token = None) -> Result:
    """Log in, then change the password. Verification is a separate, fresh login."""
    _check_token(authorization)
    recipe = _recipe(body.recipe)
    if not _host_allowed(recipe, body.base_url):
        return Result(ok=False, error="site hors du domaine de la recette")
    return await _run(recipe, body, change_to=body.new_password)


async def _run(recipe: Recipe, body: Credentials, change_to: str | None) -> Result:
    browser = BROWSER.get("chromium")
    if browser is None:
        return Result(ok=False, error="navigateur indisponible")
    # A fresh context every time: no cookie, no storage, nothing kept between runs.
    context = await browser.new_context(accept_downloads=False)
    context.set_default_timeout(STEP_TIMEOUT_MS)
    page = await context.new_page()
    try:
        await page.goto(recipe.url(body.base_url, recipe.login_path), wait_until="domcontentloaded")
        await page.fill(recipe.selectors["username"], body.username)
        await page.fill(recipe.selectors["password"], body.password)
        # A recipe may know about a code field the site only shows sometimes: ask the page,
        # not the recipe.
        totp_selector = recipe.selectors.get("totp")
        if totp_selector and await page.locator(totp_selector).count():
            if not body.totp:
                return Result(ok=False, error="le site demande un code, l'entrée n'en a pas")
            await page.fill(totp_selector, body.totp)
        await page.click(recipe.selectors["submit"])
        try:
            await page.wait_for_selector(recipe.signed_in, timeout=STEP_TIMEOUT_MS)
        except PlaywrightError:
            return Result(ok=False, error="connexion refusée par le site")
        if change_to is None:
            return Result(ok=True)

        await page.goto(
            recipe.url(body.base_url, recipe.account_path), wait_until="domcontentloaded"
        )
        await page.fill(recipe.selectors["current"], body.password)
        await page.fill(recipe.selectors["new"], change_to)
        if recipe.selectors.get("confirm"):
            await page.fill(recipe.selectors["confirm"], change_to)
        await page.click(recipe.selectors["change_submit"])
        try:
            await page.wait_for_selector(recipe.changed, timeout=STEP_TIMEOUT_MS)
        except PlaywrightError:
            return Result(ok=False, error="le site a refusé le changement de mot de passe")
        return Result(ok=True)
    except PlaywrightError as exc:
        # Only the error class: a Playwright message can quote the page, and a page can
        # quote what was typed into it.
        return Result(ok=False, error=f"échec du navigateur ({type(exc).__name__})")
    finally:
        await context.close()
