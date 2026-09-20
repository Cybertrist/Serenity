"""The whole rotation, for real: the agent, the executor, a browser, and the demo site.

Skipped unless the demo stack is up — `make rotation-demo` builds it and sets the variables
(it is a CI job too). Everything else in the suite runs against doubles; this one proves the
last mile, including the rollback when the site says no.
"""

import os
from pathlib import Path
from typing import Any

import httpx
import pytest
from pydantic import SecretStr
from sqlalchemy import Engine
from sqlmodel import Session, select

from serenity.agent.executor import run_rotations
from serenity.config import Settings
from serenity.models import Item, PolicyMode, Rotation, RotationStatus, utcnow
from tests.conftest import Account

ROTATOR_URL = os.environ.get("SERENITY_ROTATOR_URL", "")
DEMO_URL = os.environ.get("SERENITY_DEMO_URL", "")
TOKEN = os.environ.get("SERENITY_ROTATOR_TOKEN", "")
DEMO_USERNAME = os.environ.get("DEMO_USERNAME", "tristan@exemple.fr")
DEMO_PASSWORD = os.environ.get("DEMO_PASSWORD", "mot-de-passe-de-depart")

pytestmark = pytest.mark.skipif(
    not (ROTATOR_URL and DEMO_URL and TOKEN), reason="the demo stack is not running"
)


@pytest.fixture(autouse=True)
def fresh_demo_site() -> None:
    """The site keeps its state between tests: put its password back before each one."""
    httpx.post(f"{DEMO_URL}/__test/reset", timeout=10).raise_for_status()


def demo_accepts(password: str) -> bool:
    """Ask the site itself, not the vault: a redirect means the form was accepted."""
    response = httpx.post(
        f"{DEMO_URL}/connexion",
        data={"username": DEMO_USERNAME, "password": password},
        follow_redirects=False,
        timeout=10,
    )
    return response.status_code == 303


def rotation_settings(settings: Settings, tmp_path: Path) -> Settings:
    allowlist = tmp_path / "allowlist.yaml"
    allowlist.write_text("domains:\n  - demo.serenity.test\n", encoding="utf-8")
    return settings.model_copy(
        update={
            "rotator_url": ROTATOR_URL,
            "rotator_token": SecretStr(TOKEN),
            "allowlist_file": allowlist,
        }
    )


def delegated_entry(account: Account, password: str) -> dict[str, Any]:
    """An entry for the demo site, confided to the agent."""
    keys = account.keys()
    entry = {
        "v": 1,
        "type": "login",
        "name": "Démo",
        "username": DEMO_USERNAME,
        "password": password,
        "urls": [f"{DEMO_URL}/connexion"],
    }
    item = account.api.add(keys, entry)
    return account.api.move(keys, item, "agent")


def approved_rotation(session: Session, user_id: str, item_id: str) -> Rotation:
    rotation = Rotation(
        user_id=user_id,
        item_id=item_id,
        status=RotationStatus.APPROVED,
        trigger="manual",
        mode=PolicyMode.APPROVAL,
        decided_at=utcnow(),
    )
    session.add(rotation)
    session.commit()
    session.refresh(rotation)
    return rotation


def test_inspecting_a_page_lists_its_fields() -> None:
    """The tool that makes a recipe writable: it must see what the page really asks for."""
    response = httpx.post(
        f"{ROTATOR_URL}/inspecter",
        json={"url": f"{DEMO_URL}/connexion"},
        headers={"authorization": f"Bearer {TOKEN}"},
        timeout=60,
    )
    assert response.status_code == 200
    page = response.json()
    selectors = {f["selector"] for f in page["fields"]}
    assert {"#username", "#password"} <= selectors
    assert "#login" in {b["selector"] for b in page["buttons"]}


def test_inspecting_needs_the_token() -> None:
    response = httpx.post(f"{ROTATOR_URL}/inspecter", json={"url": DEMO_URL}, timeout=30)
    assert response.status_code == 401


def test_the_agent_really_changes_the_password(
    account: Account, engine: Engine, settings: Settings, agent_ready: bytes, tmp_path: Path
) -> None:
    assert demo_accepts(DEMO_PASSWORD)
    item = delegated_entry(account, DEMO_PASSWORD)
    with Session(engine) as session:
        approved_rotation(session, account.user_id, item["id"])

    report = run_rotations(engine, agent_ready, rotation_settings(settings, tmp_path), utcnow())
    assert (report.run, report.succeeded) == (1, 1)

    # The vault moved on: new revision, no pending block left behind.
    with Session(engine) as session:
        row = session.get(Item, item["id"])
        assert row is not None
        assert row.revision == item["revision"] + 1
        assert row.pending_block is None and row.pending_revision is None
        rotation = session.exec(select(Rotation)).one()
        assert rotation.status == RotationStatus.SUCCEEDED
        assert rotation.error is None

    # A device reads the new password, and the site is the one that confirms it.
    keys = account.keys()
    fresh = account.api.sync()["items"][0]
    entry = account.api.decrypt(keys, fresh)
    assert entry["password"] != DEMO_PASSWORD
    assert len(entry["password"]) == 24
    assert demo_accepts(entry["password"])
    assert not demo_accepts(DEMO_PASSWORD)


def test_a_refused_login_rolls_back_and_leaves_the_vault_alone(
    account: Account, engine: Engine, settings: Settings, agent_ready: bytes, tmp_path: Path
) -> None:
    """The vault holds a password the site no longer accepts: nothing must move."""
    item = delegated_entry(account, "ce-n-est-pas-le-bon-mot-de-passe")
    with Session(engine) as session:
        approved_rotation(session, account.user_id, item["id"])

    report = run_rotations(engine, agent_ready, rotation_settings(settings, tmp_path), utcnow())
    assert (report.run, report.rolled_back, report.succeeded) == (1, 1, 0)

    with Session(engine) as session:
        row = session.get(Item, item["id"])
        assert row is not None
        assert row.revision == item["revision"]  # untouched
        assert row.pending_block is None  # and nothing left hanging
        rotation = session.exec(select(Rotation)).one()
        assert rotation.status == RotationStatus.ROLLED_BACK
        assert rotation.error and "connexion" in rotation.error

    assert demo_accepts(DEMO_PASSWORD)  # the site still has its own password


def test_a_site_outside_the_allowlist_is_never_touched(
    account: Account, engine: Engine, settings: Settings, agent_ready: bytes, tmp_path: Path
) -> None:
    item = delegated_entry(account, DEMO_PASSWORD)
    with Session(engine) as session:
        approved_rotation(session, account.user_id, item["id"])
    narrowed = rotation_settings(settings, tmp_path)
    (tmp_path / "allowlist.yaml").write_text("domains: []\n", encoding="utf-8")

    report = run_rotations(engine, agent_ready, narrowed, utcnow())
    assert (report.run, report.failed) == (1, 1)
    with Session(engine) as session:
        rotation = session.exec(select(Rotation)).one()
        assert rotation.status == RotationStatus.FAILED
        assert rotation.error == "site hors de la liste autorisée"
    assert demo_accepts(DEMO_PASSWORD)
