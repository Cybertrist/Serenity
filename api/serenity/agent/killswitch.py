"""Kill switch: checked by code before every agent action (CLAUDE.md rule 7).

Phase 5 only reads it; phase 6 adds the API and the interface to engage it.
"""

from sqlmodel import Session

from serenity.models import Setting

KILL_SWITCH = "kill_switch"


def is_engaged(session: Session) -> bool:
    row = session.get(Setting, KILL_SWITCH)
    return bool(row and row.value and row.value.get("engaged"))
