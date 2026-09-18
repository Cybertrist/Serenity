"""Cross-language check (docs/crypto.md §10.3): Python produces, TypeScript verifies, and back.

Usage: python tests/crypto/interop.py produce OUT.json | verify IN.json
Every value is generated at random for the run; nothing here is a real secret.
"""

import json
import sys
import uuid
from pathlib import Path
from typing import Any

import nacl.utils

from serenity.crypto import blocks, contexts, items, kdf, recovery, sealed
from serenity.crypto.encoding import b64url_decode as d
from serenity.crypto.encoding import b64url_encode as e


def produce() -> dict[str, Any]:
    user = str(uuid.uuid4())
    password = "phrase interop " + nacl.utils.random(6).hex() + " été ﬁn"
    salt = nacl.utils.random(16)
    mk = kdf.derive_master_key(password, salt)
    auth, mek = kdf.derive_login_keys(mk)
    uk, ak, rk, seed = (nacl.utils.random(n) for n in (32, 32, 20, 32))
    rak, rwk = recovery.derive_recovery_keys(rk)
    pk, _ = sealed.server_keypair(seed)
    entries = []
    for i, zone in enumerate(("personal", "agent", "personal")):
        entry = {
            "v": 1,
            "type": "login",
            "name": f"Site {i} ✓",
            "password": nacl.utils.random(9).hex(),
            "urls": [f"https://exemple-{i}.fr"],
            "notes": "ligne\nsuivante",
        }
        ctx = contexts.item(user, str(uuid.uuid4()), zone, i + 1)
        key = uk if zone == "personal" else ak
        entries.append(
            {
                "context": ctx,
                "zone": zone,
                "entry": entry,
                "block": e(items.encrypt_item(key, entry, ctx)),
            }
        )
    return {
        "producer": "python",
        "user_id": user,
        "password": password,
        "salt": e(salt),
        "memlimit": kdf.DEFAULT_PARAMS.memlimit,
        "opslimit": kdf.DEFAULT_PARAMS.opslimit,
        "auth_key": e(auth),
        "uk": e(uk),
        "ak": e(ak),
        "rk_text": recovery.encode_recovery_key(rk),
        "recovery_auth_key": e(rak),
        "server_seed": e(seed),
        "uk_by_mk": e(blocks.wrap_key(mek, uk, contexts.uk_by_mk(user))),
        "uk_by_rk": e(blocks.wrap_key(rwk, uk, contexts.uk_by_rk(user))),
        "ak_by_uk": e(blocks.wrap_key(uk, ak, contexts.ak_by_uk(user, 1))),
        "ak_sealed": e(sealed.seal_for_server(pk, ak, contexts.ak_by_sk(user, 1))),
        "items": entries,
    }


def verify(data: dict[str, Any]) -> None:
    user = data["user_id"]
    params = kdf.KdfParams(memlimit=data["memlimit"], opslimit=data["opslimit"])
    auth, mek = kdf.derive_login_keys(
        kdf.derive_master_key(data["password"], d(data["salt"]), params)
    )
    assert e(auth) == data["auth_key"], "auth key"
    uk = blocks.unwrap_key(mek, d(data["uk_by_mk"]), contexts.uk_by_mk(user))
    assert e(uk) == data["uk"], "uk by mek"
    rak, rwk = recovery.derive_recovery_keys(recovery.decode_recovery_key(data["rk_text"]))
    assert e(rak) == data["recovery_auth_key"], "recovery auth key"
    assert blocks.unwrap_key(rwk, d(data["uk_by_rk"]), contexts.uk_by_rk(user)) == uk, "uk by rwk"
    ak = blocks.unwrap_key(uk, d(data["ak_by_uk"]), contexts.ak_by_uk(user, 1))
    assert e(ak) == data["ak"], "ak by uk"
    pk, sk = sealed.server_keypair(d(data["server_seed"]))
    assert sealed.open_sealed(pk, sk, d(data["ak_sealed"]), contexts.ak_by_sk(user, 1)) == ak
    for case in data["items"]:
        key = uk if case["zone"] == "personal" else ak
        assert items.decrypt_item(key, d(case["block"]), case["context"]) == case["entry"], "item"


if __name__ == "__main__":
    command, path = sys.argv[1], Path(sys.argv[2])
    if command == "produce":
        path.write_text(json.dumps(produce(), ensure_ascii=False, indent=2), encoding="utf-8")
        print(f"python produced {path}")
    elif command == "verify":
        verify(json.loads(path.read_text(encoding="utf-8")))
        print(f"python verified {path}")
    else:
        raise SystemExit("usage: interop.py produce|verify FILE")
