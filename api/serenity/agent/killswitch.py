"""Kill switch: checked by code before every agent action (CLAUDE.md rule 7).

Engaging it is always easy (a device session is enough); releasing it needs the unlocked level.
"""

from datetime import datetime
from typing import Any

from sqlmodel import Session

from serenity import audit
from serenity.models import Actor, Setting

KILL_SWITCH = "kill_switch"


def state(session: Session) -> dict[str, Any]:
    row = session.get(Setting, KILL_SWITCH)
    value: dict[str, Any] = dict(row.value) if row and row.value else {}
    return {"engaged": bool(value.get("engaged")), "changed_at": value.get("changed_at")}


def is_engaged(session: Session) -> bool:
    return bool(state(session)["engaged"])


def set_engaged(session: Session, engaged: bool, user_id: str, now: datetime) -> dict[str, Any]:
    row = session.get(Setting, KILL_SWITCH) or Setting(key=KILL_SWITCH)
    row.value = {"engaged": engaged, "changed_at": now.isoformat()}
    row.updated_at = now
    session.add(row)
    session.commit()
    action = "agent.kill_switch.engage" if engaged else "agent.kill_switch.release"
    audit.record(session, Actor.USER, action, user_id=user_id)
    return state(session)
