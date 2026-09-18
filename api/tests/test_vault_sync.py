from datetime import UTC, datetime, timedelta

from sqlmodel import Session, select

from serenity.models import AuditLog, Criticality, Entry
from serenity.vault import parse_item
from serenity.vault_sync import sync_entries
from tests.fake_bw import FAKE_VAULT_PASSWORD, ITEM_ID, NOTE_ID, login_item

NOW = datetime(2026, 9, 18, 12, 0, tzinfo=UTC)


def test_new_items_are_added_as_critical(db: Session) -> None:
    report = sync_entries(db, [parse_item(login_item())], NOW)
    assert (report.added, report.updated, report.removed, report.total) == (1, 0, 0, 1)
    entry = db.exec(select(Entry)).one()
    assert entry.criticality is Criticality.CRITICAL
    assert entry.domain == "www.example.org"
    assert entry.password_changed_at == datetime(2026, 1, 1, 10, 0, tzinfo=UTC)
    assert entry.last_synced_at == NOW


def test_unchanged_items_are_not_counted_as_updated(db: Session) -> None:
    items = [parse_item(login_item())]
    sync_entries(db, items, NOW)
    report = sync_entries(db, items, NOW + timedelta(minutes=30))
    assert (report.added, report.updated) == (0, 0)


def test_changes_are_applied_and_next_rotation_recomputed(db: Session) -> None:
    sync_entries(db, [parse_item(login_item())], NOW)
    entry = db.exec(select(Entry)).one()
    entry.rotation_interval_days = 90
    db.add(entry)
    db.commit()
    changed = login_item(name="Renamed", passwordRevisionDate="2026-09-01T00:00:00Z")
    report = sync_entries(db, [parse_item(changed)], NOW)
    assert report.updated == 1
    db.refresh(entry)
    assert entry.name == "Renamed"
    assert entry.next_rotation_at == datetime(2026, 11, 30, tzinfo=UTC)


def test_user_choices_survive_a_sync(db: Session) -> None:
    sync_entries(db, [parse_item(login_item())], NOW)
    entry = db.exec(select(Entry)).one()
    entry.criticality = Criticality.SECONDARY
    db.add(entry)
    db.commit()
    sync_entries(db, [parse_item(login_item())], NOW)
    db.refresh(entry)
    assert entry.criticality is Criticality.SECONDARY


def test_vanished_items_are_marked_removed_then_restored(db: Session) -> None:
    sync_entries(db, [parse_item(login_item()), parse_item(login_item(NOTE_ID, "Other"))], NOW)
    report = sync_entries(db, [parse_item(login_item())], NOW)
    assert report.removed == 1
    removed = db.exec(select(Entry).where(Entry.vault_item_id == NOTE_ID)).one()
    assert removed.removed_at == NOW
    sync_entries(db, [parse_item(login_item()), parse_item(login_item(NOTE_ID, "Other"))], NOW)
    db.refresh(removed)
    assert removed.removed_at is None


def test_no_password_reaches_the_database(db: Session, settings: object) -> None:
    sync_entries(db, [parse_item(login_item(ITEM_ID))], NOW)
    db.commit()
    rows = [e.model_dump_json() for e in db.exec(select(Entry))]
    rows += [a.model_dump_json() for a in db.exec(select(AuditLog))]
    assert all(FAKE_VAULT_PASSWORD not in row for row in rows)
