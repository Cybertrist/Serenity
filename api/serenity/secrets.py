"""Key files and privilege drop.

Key files are `root:root 0400` on the host. Containers start as root with no capability
but SETUID/SETGID, read their key into memory, then drop to the unprivileged UID for good.
"""

import os
from pathlib import Path

KEY_BYTES = 32
SERVICE_UID = 10001
SERVICE_GID = 10001


class SecretFileError(RuntimeError):
    """A key file is missing, unreadable or malformed. Never contains key material."""


def read_key_file(path: Path) -> bytes:
    try:
        data = path.read_bytes()
    except FileNotFoundError:
        raise SecretFileError(f"{path} is missing: run `make keys` on the host") from None
    except PermissionError:
        raise SecretFileError(f"{path} is not readable by this process") from None
    if len(data) != KEY_BYTES:
        raise SecretFileError(f"{path} must contain exactly {KEY_BYTES} bytes")
    return data


def drop_privileges(uid: int = SERVICE_UID, gid: int = SERVICE_GID) -> None:
    """Switch from root to uid/gid. Linux clears every capability on this transition."""
    if os.getuid() != 0:
        raise SecretFileError("must start as root to read key files, then drop privileges")
    os.setgroups([])
    os.setgid(gid)
    os.setuid(uid)
    if os.getuid() != uid or os.geteuid() != uid or os.getgid() != gid:
        raise SecretFileError("privilege drop failed")
    try:
        os.setuid(0)
    except PermissionError:
        return
    raise SecretFileError("privileges could be regained after the drop")
