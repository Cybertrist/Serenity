"""Command-line parsing of the test client."""

from typing import Any

import pytest

from serenity import devclient


def test_every_command_is_accepted_and_names_keep_their_spaces(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    seen: list[tuple[str, Any]] = []
    for name in list(devclient.VAULT_COMMANDS):
        monkeypatch.setitem(
            devclient.VAULT_COMMANDS, name, lambda _c, _s, target, n=name: seen.append((n, target))
        )
    monkeypatch.setattr(devclient, "_load", lambda: {})
    monkeypatch.setattr(devclient, "_save", lambda state: None)
    for name in ("scan", "breaches", "notifications", "list"):
        assert devclient.main([name]) == 0
    assert devclient.main(["delegate", "Test", "fuite"]) == 0
    assert ("delegate", "Test fuite") in seen
    assert {"scan", "breaches", "notifications"} <= {n for n, _ in seen}
