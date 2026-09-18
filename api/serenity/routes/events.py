"""Real-time stream of notifications while the app is open (ADR-005): Server-Sent Events.

Each connection lasts at most a few minutes; the browser's EventSource reconnects by itself
and sends Last-Event-ID, so nothing is missed. No third party is involved.
"""

import asyncio
import json
import time
from collections.abc import AsyncIterator
from typing import Annotated

from fastapi import APIRouter, Header, Request
from fastapi.responses import StreamingResponse
from sqlmodel import Session, col, select

from serenity.deps import SessionDep
from serenity.models import Notification

router = APIRouter(prefix="/api", tags=["events"])

POLL_SECONDS = 2.0
# A comment line now and then keeps proxies from closing an idle connection.
KEEPALIVE_SECONDS = 15.0
MAX_STREAM_SECONDS = 300.0


def _pending(engine: object, user_id: str, after: int) -> list[Notification]:
    with Session(engine) as db:  # type: ignore[arg-type]
        return list(
            db.exec(
                select(Notification)
                .where(Notification.user_id == user_id, col(Notification.id) > after)
                .order_by(col(Notification.id))
            )
        )


async def _stream(
    request: Request, user_id: str, after: int, max_seconds: float
) -> AsyncIterator[str]:
    engine = request.app.state.engine
    deadline = time.monotonic() + max_seconds
    yield "retry: 3000\n\n"
    last_sent = time.monotonic()
    while time.monotonic() < deadline and not await request.is_disconnected():
        for n in _pending(engine, user_id, after):
            after = n.id or after
            data = {"id": n.id, "kind": n.kind, "item_id": n.item_id, "breach_id": n.breach_id}
            yield f"id: {n.id}\nevent: notification\ndata: {json.dumps(data)}\n\n"
            last_sent = time.monotonic()
        if time.monotonic() - last_sent > KEEPALIVE_SECONDS:
            yield ": keep-alive\n\n"
            last_sent = time.monotonic()
        await asyncio.sleep(POLL_SECONDS)


@router.get("/events")
def get_events(
    request: Request,
    row: SessionDep,
    last_event_id: Annotated[str | None, Header(alias="last-event-id")] = None,
    max_seconds: float = MAX_STREAM_SECONDS,
) -> StreamingResponse:
    after = (
        int(last_event_id)
        if last_event_id and last_event_id.isdigit()
        else _latest(request, row.user_id)
    )
    return StreamingResponse(
        _stream(request, row.user_id, after, min(max_seconds, MAX_STREAM_SECONDS)),
        media_type="text/event-stream",
        headers={"Cache-Control": "no-store", "X-Accel-Buffering": "no"},
    )


def _latest(request: Request, user_id: str) -> int:
    """A new connection only streams what happens from now on."""
    with Session(request.app.state.engine) as db:
        last = db.exec(
            select(Notification.id)
            .where(Notification.user_id == user_id)
            .order_by(col(Notification.id).desc())
        ).first()
    return last or 0
