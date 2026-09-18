import httpx
import pytest
from pydantic import SecretStr

from serenity.vault import Vault, VaultError
from tests.fake_bw import FAKE_VAULT_PASSWORD, ITEM_ID, NOTE_ID, FakeBwServe, login_item


def _vault(fake: FakeBwServe) -> Vault:
    return Vault(httpx.Client(base_url="http://127.0.0.1:8087", transport=fake.transport))


def test_list_keeps_login_items_only() -> None:
    note = {"id": NOTE_ID, "type": 2, "name": "Secure note"}
    items = _vault(FakeBwServe([login_item(), note])).list_items()
    assert [i.id for i in items] == [ITEM_ID]


def test_item_metadata_is_parsed() -> None:
    item = _vault(FakeBwServe()).get_item(ITEM_ID)
    assert item.domain == "www.example.org"
    assert item.username == "me@example.org"
    assert item.password_changed_at is not None
    assert item.password_changed_at.year == 2026
    assert item.password_changed_at.month == 1  # creationDate: never changed


def test_password_revision_date_wins_over_creation_date() -> None:
    fake = FakeBwServe([login_item(passwordRevisionDate="2026-05-05T00:00:00Z")])
    item = _vault(fake).get_item(ITEM_ID)
    assert item.password_changed_at is not None
    assert item.password_changed_at.month == 5


def test_password_is_never_exposed_by_repr_or_dump() -> None:
    item = _vault(FakeBwServe()).get_item(ITEM_ID)
    assert FAKE_VAULT_PASSWORD not in repr(item)
    assert FAKE_VAULT_PASSWORD not in item.model_dump_json()
    assert item.password is not None
    assert item.password.get_secret_value() == FAKE_VAULT_PASSWORD


def test_set_password_keeps_other_fields() -> None:
    fake = FakeBwServe()
    _vault(fake).set_password(ITEM_ID, SecretStr("new-password-value"))
    stored = fake.items[ITEM_ID]
    assert stored["login"]["password"] == "new-password-value"
    assert stored["notes"] == "keep me"
    assert stored["login"]["username"] == "me@example.org"


def test_sync_and_status() -> None:
    fake = FakeBwServe()
    vault = _vault(fake)
    vault.sync()
    assert fake.syncs == 1
    assert vault.status() == "unlocked"


def test_errors_are_raised_without_content() -> None:
    fake = FakeBwServe(state="locked")
    with pytest.raises(VaultError) as exc:
        _vault(fake).list_items()
    assert "locked" in str(exc.value)
    assert FAKE_VAULT_PASSWORD not in str(exc.value)


def test_invalid_item_ids_are_refused() -> None:
    with pytest.raises(VaultError):
        _vault(FakeBwServe()).get_item("../../status")
