"""API server for the TypeScript end-to-end tests: python tests/e2e_server.py [port].

Only in the dev image (tests/ is not shipped). Temporary database, random keys, and a
test-only clock for TOTP: POST /__test/tick moves it 30 s forward and returns it, so the
client can compute a fresh code for each step without waiting. POST /__test/schedule runs the
agent's due-date check, POST /__test/rotate runs the approved rotations for real (used by the
film that records the agent at work), POST /__test/icons runs the icon pass against a site
double. POST /__test/reset empties
every table except the settings (server key), so each test file starts from scratch.
"""

import struct
import sys
import tempfile
import zlib
from pathlib import Path

import httpx
import nacl.utils
import uvicorn
from sqlmodel import Session, SQLModel

import serenity.auth.totp
from serenity.agent.executor import run_rotations
from serenity.agent.icons import run_icons
from serenity.agent.rotations import run_schedule
from serenity.agent.service import publish_server_key
from serenity.config import Settings
from serenity.db import create_db_engine, init_db
from serenity.main import create_app
from serenity.models import utcnow

CLOCK = {"now": 1_900_000_000.0}


def square_png(size: int = 32, rgb: tuple[int, int, int] = (0xE8, 0x43, 0x4B)) -> bytes:
    """A plain coloured square, built by hand: the dev image has no image library, and a
    screenshot needs something one can actually see."""

    def chunk(kind: bytes, data: bytes) -> bytes:
        return (
            struct.pack(">I", len(data))
            + kind
            + data
            + struct.pack(">I", zlib.crc32(kind + data) & 0xFFFFFFFF)
        )

    header = struct.pack(">IIBBBBB", size, size, 8, 2, 0, 0, 0)
    row = b"\x00" + bytes(rgb) * size
    return (
        b"\x89PNG\r\n\x1a\n"
        + chunk(b"IHDR", header)
        + chunk(b"IDAT", zlib.compress(row * size, 9))
        + chunk(b"IEND", b"")
    )


# Kept, unlike a throwaway: the executor needs the seed to open the agent zone.
SERVER_KEY = nacl.utils.random(32)


def build(tmp: Path) -> object:
    settings = Settings(
        secret_key="e2e-" + "k" * 44,  # type: ignore[arg-type]
        db_path=tmp / "serenity.sqlite",
        auth_hash_memlimit=8 * 1024 * 1024,
        auth_hash_opslimit=1,
    )
    engine = create_db_engine(settings.db_path)
    init_db(engine)
    with Session(engine) as session:
        publish_server_key(session, SERVER_KEY, utcnow())
    engine.dispose()
    serenity.auth.totp.now = lambda: CLOCK["now"]
    app = create_app(settings, totp_key=nacl.utils.random(32))

    @app.post("/__test/tick")
    def tick() -> dict[str, float]:
        CLOCK["now"] += 30
        return CLOCK

    @app.post("/__test/schedule")
    def schedule() -> dict[str, int]:
        """Run the agent's due-date check now (the agent process is not started in tests)."""
        with Session(app.state.engine) as session:
            report = run_schedule(session, utcnow())
        return {"scheduled": report.scheduled, "reminders": report.reminders}

    @app.post("/__test/rotate")
    def rotate() -> dict[str, int | bool]:
        """Run the approved rotations now, for real, against whatever executor is configured."""
        report = run_rotations(app.state.engine, SERVER_KEY, settings, utcnow())
        return {
            "run": report.run,
            "succeeded": report.succeeded,
            "rolled_back": report.rolled_back,
            "failed": report.failed,
            "skipped": report.skipped,
        }

    @app.post("/__test/icons")
    def icons() -> dict[str, int]:
        """Run the agent's icon pass against a site double that always answers one PNG.

        The checks of `agent/icons.py` are not bypassed: the entry must still point at https
        and at a name that resolves to a public address (ui-smoke.sh adds one to /etc/hosts).
        """
        transport = httpx.MockTransport(
            lambda request: httpx.Response(
                200, content=square_png(), headers={"content-type": "image/png"}
            )
        )
        with httpx.Client(transport=transport) as http:
            report = run_icons(app.state.engine, SERVER_KEY, http, utcnow(), 30)
        return {"fetched": report.fetched, "failed": report.failed}

    @app.post("/__test/reset", status_code=204)
    def reset() -> None:
        engine = app.state.engine
        with Session(engine) as session:
            for table in reversed(SQLModel.metadata.sorted_tables):
                if table.name != "setting":
                    session.connection().execute(table.delete())
            session.commit()

    return app


if __name__ == "__main__":
    port = int(sys.argv[1]) if len(sys.argv) > 1 else 8765
    with tempfile.TemporaryDirectory() as tmp:
        uvicorn.run(build(Path(tmp)), host="127.0.0.1", port=port, log_level="warning")  # type: ignore[arg-type]
