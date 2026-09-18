import json
import os
from pathlib import Path
from typing import Any

import pytest

# Repository checkout: api/tests/crypto -> repo root. In the dev container, /shared is mounted.
_CANDIDATES = [
    Path(os.environ["SERENITY_TEST_VECTORS"]) if "SERENITY_TEST_VECTORS" in os.environ else None,
    Path(__file__).resolve().parents[3] / "shared" / "test-vectors",
    Path("/shared/test-vectors"),
]
VECTORS = next(p for p in _CANDIDATES if p is not None and p.is_dir())


@pytest.fixture(scope="session")
def vectors() -> Any:
    def load(name: str) -> Any:
        return json.loads((VECTORS / name).read_text(encoding="utf-8"))

    return load
