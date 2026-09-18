"""Vault API through the reference client: the server only ever sees encrypted blocks."""

from datetime import timedelta
from typing import Any

import pytest
from fastapi.testclient import TestClient
from sqlmodel import Session, select

from serenity.crypto import contexts, items
from serenity.crypto.encoding import b64url_decode, b64url_encode
from serenity.devclient import ApiError, Client, Keyring
from serenity.models import AuditLog, Item, ItemRevision, User, utcnow
from serenity.vault import service
from tests.conftest import PASSWORD, USERNAME, Account

ENTRY: dict[str, Any] = {
    "v": 1,
    "type": "login",
    "name": "Netflix",
    "username": "tristan@exemple.fr",
    "password": "faux-mot-de-passe-de-test",
    "urls": ["https://www.netflix.com"],
}


@pytest.fixture
def keys(account: Account) -> Keyring:
    return account.keys()


def _status(fn: Any, *args: Any) -> int:
    try:
        fn(*args)
    except ApiError as exc:
        return exc.status
    return 200


def test_add_then_sync_on_another_device(
    account: Account, keys: Keyring, client: TestClient
) -> None:
    item = account.api.add(keys, ENTRY)
    assert (item["zone"], item["revision"]) == ("personal", 1)
    other = Client(client)
    other_keys = other.login(USERNAME, PASSWORD, account.code())
    synced = other.sync()
    assert [i["id"] for i in synced["items"]] == [item["id"]]
    assert other.decrypt(other_keys, synced["items"][0]) == ENTRY


def test_sync_since_returns_only_changes(account: Account, keys: Keyring) -> None:
    first = account.api.add(keys, ENTRY)
    seq = account.api.sync()["seq"]
    second = account.api.add(keys, {**ENTRY, "name": "Spotify"})
    changes = account.api.sync(seq)
    assert [i["id"] for i in changes["items"]] == [second["id"]]
    assert changes["seq"] > seq
    assert account.api.sync(changes["seq"])["items"] == []
    assert first["seq"] < second["seq"]


def test_update_with_revision_check(account: Account, keys: Keyring) -> None:
    item = account.api.add(keys, ENTRY)
    updated = account.api.edit(keys, item, {**ENTRY, "password": "nouveau-faux-mot-de-passe"})
    assert updated["revision"] == 2
    assert account.api.decrypt(keys, updated)["password"] == "nouveau-faux-mot-de-passe"
    # A second device still editing revision 1 gets a conflict with the current version.
    with pytest.raises(ApiError) as exc:
        account.api.edit(keys, item, {**ENTRY, "notes": "modif concurrente"})
    assert exc.value.status == 409
    response = account.api.http.put(
        f"/api/vault/items/{item['id']}",
        json={"base_revision": 1, "block": updated["block"]},
        headers={"Cookie": f"serenity_session={account.api.token}"},
    )
    assert response.status_code == 409
    assert response.json()["current"]["revision"] == 2


def test_blocks_are_bound_to_their_revision(account: Account, keys: Keyring) -> None:
    item = account.api.add(keys, ENTRY)
    # A block encrypted for revision 1, replayed as revision 2: unreadable.
    replayed = {**item, "revision": 2}
    with pytest.raises(Exception, match="decryption failed"):
        account.api.decrypt(keys, replayed)


def test_trash_restore_and_purge(account: Account, keys: Keyring, client: TestClient) -> None:
    item = account.api.add(keys, ENTRY)
    trashed = account.api.trash(item)
    assert trashed["deleted_at"] is not None
    restored = account.api.call("POST", f"/api/vault/items/{item['id']}/restore")
    assert restored["deleted_at"] is None
    account.api.trash(restored)
    engine = client.app.state.engine  # type: ignore[attr-defined]
    with Session(engine) as db:
        later = utcnow() + timedelta(days=service.TRASH_DAYS + 1)
        assert service.purge_trash(db, account.user_id, later) == 1
        row = db.get(Item, item["id"])
        assert row is not None
        assert row.block is None
    tombstone = next(i for i in account.api.sync()["items"] if i["id"] == item["id"])
    assert tombstone["purged"] is True
    assert tombstone["block"] is None


def test_history_keeps_the_last_ten_versions(account: Account, keys: Keyring) -> None:
    item = account.api.add(keys, ENTRY)
    for n in range(12):
        item = account.api.edit(keys, item, {**ENTRY, "password": f"faux-{n}"})
    history = account.api.history(keys, item["id"])
    assert len(history) == service.HISTORY_LIMIT
    assert [h["revision"] for h in history] == list(range(12, 2, -1))
    assert history[0]["entry"]["password"] == "faux-10"


def test_delegate_and_reclaim(account: Account, keys: Keyring, client: TestClient) -> None:
    item = account.api.add(keys, ENTRY)
    item = account.api.edit(keys, item, {**ENTRY, "notes": "v2"})
    delegated = account.api.move(keys, item, "agent")
    assert (delegated["zone"], delegated["revision"]) == ("agent", 3)
    assert account.api.decrypt(keys, delegated)["notes"] == "v2"
    # Encrypted with AK now: UK cannot open it.
    ctx = contexts.item(keys.user_id, item["id"], "agent", 3)
    with pytest.raises(Exception, match="decryption failed"):
        items.decrypt_item(keys.uk, b64url_decode(delegated["block"]), ctx)
    reclaimed = account.api.move(keys, delegated, "personal")
    assert reclaimed["zone"] == "personal"
    zones = {h["zone"] for h in account.api.history(keys, item["id"])}
    assert zones == {"personal"}  # agent-zone history erased on reclaim
    with Session(client.app.state.engine) as db:  # type: ignore[attr-defined]
        actions = [a.action for a in db.exec(select(AuditLog))]
    assert "vault.item.delegate" in actions
    assert "vault.item.reclaim" in actions


def test_zone_change_needs_confirmation(account: Account, keys: Keyring) -> None:
    item = account.api.add(keys, ENTRY)
    body = {"base_revision": 1, "block": item["block"]}
    assert _status(account.api.call, "POST", f"/api/vault/items/{item['id']}/delegate", body) == 422


def test_changes_need_the_unlocked_level(account: Account, keys: Keyring) -> None:
    item = account.api.add(keys, ENTRY)
    account.api.call("POST", "/api/auth/lock")
    assert _status(account.api.add, keys, ENTRY) == 403
    assert _status(account.api.edit, keys, item, ENTRY) == 403
    assert _status(account.api.trash, item) == 403
    # Reading encrypted blocks stays possible.
    assert len(account.api.sync()["items"]) == 1


def test_malformed_blocks_are_refused(account: Account, keys: Keyring) -> None:
    import uuid

    for block in (
        b64url_encode(b"\x01\x01" + bytes(40)),
        b64url_encode(b"\x01\x01" + bytes(24 + 100 + 16)),
        "!!",
    ):
        body = {"items": [{"id": str(uuid.uuid4()), "block": block}]}
        assert _status(account.api.call, "POST", "/api/vault/items", body) == 422
    body = {"items": [{"id": "pas-un-uuid", "block": account.api.add(keys, ENTRY)["block"]}]}
    assert _status(account.api.call, "POST", "/api/vault/items", body) == 422


def test_items_of_another_account_are_invisible(
    account: Account, keys: Keyring, client: TestClient
) -> None:
    item = account.api.add(keys, ENTRY)
    other_id = "00000000-0000-4000-8000-000000000000"
    with Session(client.app.state.engine) as db:  # type: ignore[attr-defined]
        db.add(
            User(
                id=other_id,
                username="autre",
                kdf_salt=bytes(16),
                kdf_memlimit=1,
                kdf_opslimit=1,
                auth_hash="x",
                recovery_hash="x",
                uk_by_mk=b"",
                uk_by_rk=b"",
                totp_secret_enc=b"",
            )
        )
        db.flush()
        row = db.get(Item, item["id"])
        assert row is not None
        row.user_id = other_id
        db.add(row)
        db.commit()
    assert _status(account.api.call, "GET", f"/api/vault/items/{item['id']}/history") == 404
    assert account.api.sync()["items"] == []


def test_import_batch(account: Account, keys: Keyring) -> None:
    import uuid

    batch = []
    for n in range(50):
        item_id = str(uuid.uuid4())
        ctx = contexts.item(keys.user_id, item_id, "personal", 1)
        block = items.encrypt_item(keys.uk, {**ENTRY, "name": f"Site {n}"}, ctx)
        batch.append({"id": item_id, "block": b64url_encode(block)})
    created = account.api.call("POST", "/api/vault/items", {"items": batch})
    assert len(created) == 50
    assert all(i["zone"] == "personal" for i in created)


def test_server_never_stores_plaintext(account: Account, keys: Keyring, client: TestClient) -> None:
    account.api.add(keys, ENTRY)
    with Session(client.app.state.engine) as db:  # type: ignore[attr-defined]
        blobs = [i.block or b"" for i in db.exec(select(Item))]
        blobs += [r.block for r in db.exec(select(ItemRevision))]
        logs = [a.model_dump_json() for a in db.exec(select(AuditLog))]
    for value in (b"Netflix", b"faux-mot-de-passe-de-test", b"tristan@exemple.fr"):
        assert all(value not in blob for blob in blobs)
        assert all(value.decode() not in log for log in logs)
