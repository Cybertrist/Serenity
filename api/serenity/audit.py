"""Audit journal and anti-secret filter.

Every action of the agent, the user or the system goes through `record()`.
`redact()` and `SecretFilter` make sure nothing that looks like a secret reaches
the audit table or the logs, even by mistake.
"""

import logging
import re
from typing import Any

from sqlmodel import Session

from serenity.models import Actor, AuditLog

REDACTED = "[REDACTED]"

# Dict keys whose value is always hidden, whatever it contains.
_SENSITIVE_KEY = re.compile(
    r"pass(word|wd|phrase)?|secret|token|totp|api[_-]?key|client[_-]?secret|"
    r"cookie|session|authorization|credential|private[_-]?key|seed",
    re.IGNORECASE,
)

# `key=value`, `key: value` or `"key": "value"` inside free text.
_INLINE_SECRET = re.compile(
    r"""(?P<key>["']?(?:pass(?:word|wd|phrase)?|secret|token|totp|api[_-]?key|
    client[_-]?secret|authorization)["']?\s*[:=]\s*)
    (?P<value>"[^"]*"|'[^']*'|(?:bearer\s+)?[^\s,;&}]+)""",
    re.IGNORECASE | re.VERBOSE,
)

# Well-known token formats (tk_ tokens, bearer tokens, argon2 hashes, otpauth URIs).
_KNOWN_TOKENS = re.compile(
    r"tk_[A-Za-z0-9]{8,}|\$argon2(?:id|i|d)\$\S+|otpauth://\S+|bearer\s+[A-Za-z0-9._~+/=-]{8,}",
    re.IGNORECASE,
)


def redact_text(text: str) -> str:
    text = _KNOWN_TOKENS.sub(REDACTED, text)
    return _INLINE_SECRET.sub(lambda m: m.group("key") + REDACTED, text)


def redact(value: Any) -> Any:
    """Return a copy of `value` with every secret-looking part replaced by [REDACTED]."""
    if isinstance(value, dict):
        return {
            k: REDACTED if _SENSITIVE_KEY.search(str(k)) else redact(v) for k, v in value.items()
        }
    if isinstance(value, list | tuple | set):
        return [redact(v) for v in value]
    if isinstance(value, str):
        return redact_text(value)
    return value


def record(
    session: Session,
    actor: Actor,
    action: str,
    *,
    outcome: str = "success",
    user_id: str | None = None,
    target_type: str | None = None,
    target_id: str | int | None = None,
    details: dict[str, Any] | None = None,
) -> AuditLog:
    """Write one audit line and commit it."""
    entry = AuditLog(
        user_id=user_id,
        actor=actor,
        action=action,
        outcome=outcome,
        target_type=target_type,
        target_id=None if target_id is None else redact_text(str(target_id)),
        details=redact(details or {}),
    )
    session.add(entry)
    session.commit()
    session.refresh(entry)
    return entry


class SecretFilter(logging.Filter):
    """Logging filter that redacts secrets from every log record."""

    def filter(self, record: logging.LogRecord) -> bool:
        record.msg = redact_text(record.getMessage())
        record.args = None
        return True


def configure_logging(level: str) -> None:
    handler = logging.StreamHandler()
    handler.setFormatter(logging.Formatter("%(asctime)s %(levelname)s %(name)s: %(message)s"))
    handler.addFilter(SecretFilter())
    root = logging.getLogger()
    root.handlers = [handler]
    root.setLevel(level)
    # Route uvicorn logs through the same filtered handler.
    for name in ("uvicorn", "uvicorn.error", "uvicorn.access"):
        uv_logger = logging.getLogger(name)
        uv_logger.handlers = []
        uv_logger.propagate = True
