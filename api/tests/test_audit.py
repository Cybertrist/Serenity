import logging

import pytest
from sqlmodel import Session, select

from serenity.audit import REDACTED, SecretFilter, record, redact, redact_text
from serenity.models import Actor, AuditLog


def test_sensitive_keys_are_redacted_recursively() -> None:
    data = {
        "domain": "example.org",
        "password": "hunter2",
        "nested": {"api_key": "abc", "client_secret": "def", "count": 3},
        "items": [{"totp": "123456"}, "plain"],
    }
    assert redact(data) == {
        "domain": "example.org",
        "password": REDACTED,
        "nested": {"api_key": REDACTED, "client_secret": REDACTED, "count": 3},
        "items": [{"totp": REDACTED}, "plain"],
    }


@pytest.mark.parametrize(
    "text",
    [
        "login failed password=hunter2",
        'payload {"password": "hunter2"}',
        "token: hunter2",
        "Authorization: Bearer hunter2hunter2",
        "ntfy tk_hunter2hunter2hunter2",
        "hash $argon2id$v=19$m=65536,t=3,p=4$hunter2",
        "otpauth://totp/Serenity:tristan?secret=HUNTER2",
    ],
)
def test_inline_secrets_are_redacted(text: str) -> None:
    result = redact_text(text)
    assert "hunter2" not in result.lower()
    assert REDACTED in result


def test_harmless_text_is_untouched() -> None:
    assert redact_text("rotation of example.org succeeded") == "rotation of example.org succeeded"


def test_record_stores_redacted_details(db: Session) -> None:
    record(db, Actor.AGENT, "rotation.start", target_id=4, details={"password": "hunter2"})
    row = db.exec(select(AuditLog)).one()
    assert row.actor is Actor.AGENT
    assert row.target_id == "4"
    assert row.details == {"password": REDACTED}


def test_log_filter_redacts_messages(caplog: pytest.LogCaptureFixture) -> None:
    logger = logging.getLogger("test.audit")
    logger.addFilter(SecretFilter())
    with caplog.at_level(logging.INFO, logger="test.audit"):
        logger.info("calling bw with password=%s", "hunter2")
    assert "hunter2" not in caplog.text
    assert REDACTED in caplog.text
