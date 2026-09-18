# ruff: noqa: S101  (asserts are sanity checks of the generated data)
"""Generate the shared crypto test vectors from the Python reference implementation.

Run with `make vectors`. Only rerun when docs/crypto.md changes: sealed boxes are
randomized, so their bytes change at every run.
Every value here is a throwaway test value, never a real secret.
"""

import json
import sys
from pathlib import Path
from typing import Any

from serenity.crypto import blocks, contexts, items, kdf, recovery, sealed
from serenity.crypto.encoding import b64url_encode as b64
from serenity.crypto.errors import CryptoError

OUT = Path(sys.argv[1]) if len(sys.argv) > 1 else Path(__file__).parent
USER = "7b2c1a4e-3f5d-4a6b-9c8d-1e2f3a4b5c6d"
ITEM = "0f0c7a9e-1b2c-4d5e-8f90-123456789abc"
EXPORT = "c3d4e5f6-a7b8-4c9d-8e0f-a1b2c3d4e5f6"


def pattern(n: int, start: int) -> bytes:
    return bytes((start + i) % 256 for i in range(n))


def write(name: str, data: dict[str, Any]) -> None:
    text = json.dumps(data, ensure_ascii=False, indent=2) + "\n"
    (OUT / name).write_text(text, encoding="utf-8")
    print(f"wrote {name}")


def must_fail(fn: Any, *args: Any) -> None:
    try:
        fn(*args)
    except CryptoError:
        return
    raise AssertionError(f"{fn.__name__}{args!r} should fail")


def gen_argon2id() -> None:
    params = kdf.DEFAULT_PARAMS
    cases = []
    passwords = [
        "correct horse battery staple",
        "Crème brûlée à l'été !",  # precomposed accents
        "Cre\u0300me bru\u0302le\u0301e a\u0300 l'e\u0301te\u0301 !",  # combining marks
        # Ligatures, circled digit, fullwidth letters: all changed by NFKC.
        "ﬁle ﬁnal ① Ｆｕｌｌ",  # noqa: RUF001
        "p" * 200,
    ]
    for i, pw in enumerate(passwords):
        salt = pattern(16, 16 * i)
        mk = kdf.derive_master_key(pw, salt, params)
        auth, mek = kdf.derive_login_keys(mk)
        cases.append(
            {
                "password": pw,
                "normalized": kdf.normalize_password(pw).decode("utf-8"),
                "salt": b64(salt),
                "memlimit": params.memlimit,
                "opslimit": params.opslimit,
                "master_key": b64(mk),
                "auth_key": b64(auth),
                "wrap_key": b64(mek),
            }
        )
    rejected = [
        {
            "password": "short pass",
            "salt": b64(pattern(16, 0)),
            "memlimit": params.memlimit,
            "opslimit": params.opslimit,
            "reason": "fewer than 12 characters",
        },
        {
            "password": "x" * 1025,
            "salt": b64(pattern(16, 0)),
            "memlimit": params.memlimit,
            "opslimit": params.opslimit,
            "reason": "more than 1024 bytes",
        },
        {
            "password": "correct horse battery staple",
            "salt": b64(pattern(16, 0)),
            "memlimit": 32 * 1024 * 1024,
            "opslimit": 3,
            "reason": "memlimit below the floor",
        },
        {
            "password": "correct horse battery staple",
            "salt": b64(pattern(16, 0)),
            "memlimit": params.memlimit,
            "opslimit": 2,
            "reason": "opslimit below the floor",
        },
        {
            "password": "correct horse battery staple",
            "salt": b64(pattern(8, 0)),
            "memlimit": params.memlimit,
            "opslimit": 3,
            "reason": "salt is not 16 bytes",
        },
    ]
    for r in rejected:
        from serenity.crypto.encoding import b64url_decode

        must_fail(
            kdf.derive_master_key,
            r["password"],
            b64url_decode(r["salt"]),
            kdf.KdfParams(memlimit=r["memlimit"], opslimit=r["opslimit"]),
        )
    write(
        "argon2id.json",
        {
            "description": "Argon2id master key and login subkeys (§4, §5.5)",
            "cases": cases,
            "rejected": rejected,
        },
    )


def gen_kdf() -> None:
    cases = []
    ctxs = [
        kdf.CTX_AUTH,
        kdf.CTX_WRAP,
        kdf.CTX_RECOVERY_AUTH,
        kdf.CTX_RECOVERY_WRAP,
        kdf.CTX_RECOVERY_CHECK,
        kdf.CTX_SEAL,
        kdf.CTX_EXPORT,
    ]
    for i, ctx in enumerate(ctxs):
        for subkey_id in (0, 1, 2, 2**40 + 7):
            key = pattern(32, 32 * i + 1)
            cases.append(
                {
                    "key": b64(key),
                    "id": subkey_id,
                    "context": ctx,
                    "subkey": b64(kdf.derive_subkey(key, subkey_id, ctx)),
                }
            )
    write(
        "kdf.json",
        {"description": "crypto_kdf_derive_from_key, 32-byte subkeys (§5.5)", "cases": cases},
    )


def gen_contexts() -> None:
    cases = [
        {"kind": "uk_by_mk", "args": [USER], "context": contexts.uk_by_mk(USER)},
        {"kind": "uk_by_rk", "args": [USER], "context": contexts.uk_by_rk(USER)},
        {"kind": "ak_by_uk", "args": [USER, 1], "context": contexts.ak_by_uk(USER, 1)},
        {"kind": "ak_by_sk", "args": [USER, 12], "context": contexts.ak_by_sk(USER, 12)},
        {
            "kind": "item",
            "args": [USER, ITEM, "personal", 1],
            "context": contexts.item(USER, ITEM, "personal", 1),
        },
        {
            "kind": "item",
            "args": [USER, ITEM, "agent", 42],
            "context": contexts.item(USER, ITEM, "agent", 42),
        },
        {"kind": "totp", "args": [USER], "context": contexts.totp(USER)},
        {"kind": "export", "args": [USER, EXPORT], "context": contexts.export(USER, EXPORT)},
    ]
    rejected = [
        {"kind": "uk_by_mk", "args": [USER.upper()], "reason": "uppercase UUID"},
        {"kind": "uk_by_mk", "args": ["not-a-uuid"], "reason": "not a UUID"},
        {"kind": "item", "args": [USER, ITEM, "shared", 1], "reason": "unknown zone"},
        {"kind": "item", "args": [USER, ITEM, "agent", 0], "reason": "revision 0"},
        {"kind": "ak_by_uk", "args": [USER, -1], "reason": "negative version"},
        {
            "kind": "item",
            "args": [USER, "0f0c7a9e-1b2c-1d5e-8f90-123456789abc", "agent", 1],
            "reason": "UUID version 1",
        },
    ]
    for r in rejected:
        must_fail(getattr(contexts, r["kind"]), *r["args"])
    write(
        "contexts.json",
        {"description": "Associated-data contexts (§5.4)", "cases": cases, "rejected": rejected},
    )


def gen_aead() -> None:
    key = pattern(32, 100)
    cases = []
    samples = [
        (contexts.uk_by_mk(USER), pattern(32, 200)),
        (contexts.ak_by_uk(USER, 1), pattern(32, 7)),
        (contexts.item(USER, ITEM, "personal", 3), "Bonjour, coffre ! 🔐".encode()),
        (contexts.totp(USER), b""),
    ]
    for i, (ctx, pt) in enumerate(samples):
        nonce = pattern(24, 50 + i)
        block = blocks.encrypt_block(key, pt, ctx, _nonce=nonce)
        cases.append(
            {
                "key": b64(key),
                "nonce": b64(nonce),
                "context": ctx,
                "plaintext": b64(pt),
                "block": b64(block),
            }
        )
    good = blocks.encrypt_block(key, b"secret", contexts.totp(USER), _nonce=pattern(24, 9))
    flipped = bytearray(good)
    flipped[-1] ^= 0x01
    header_flipped = bytearray(good)
    header_flipped[30] ^= 0x80
    rejected = [
        {"reason": "wrong context", "context": contexts.uk_by_mk(USER), "block": b64(good)},
        {"reason": "tag modified", "context": contexts.totp(USER), "block": b64(bytes(flipped))},
        {
            "reason": "ciphertext modified",
            "context": contexts.totp(USER),
            "block": b64(bytes(header_flipped)),
        },
        {
            "reason": "unknown version",
            "context": contexts.totp(USER),
            "block": b64(b"\x02" + good[1:]),
        },
        {
            "reason": "sealed type given to AEAD",
            "context": contexts.totp(USER),
            "block": b64(b"\x01\x02" + good[2:]),
        },
        {"reason": "truncated", "context": contexts.totp(USER), "block": b64(good[:41])},
        {
            "reason": "wrong key",
            "context": contexts.totp(USER),
            "block": b64(good),
            "key": b64(pattern(32, 101)),
        },
    ]
    for r in rejected:
        from serenity.crypto.encoding import b64url_decode

        k = b64url_decode(r["key"]) if "key" in r else key
        must_fail(blocks.decrypt_block, k, b64url_decode(r["block"]), r["context"])
    write(
        "aead.json",
        {
            "description": "AEAD blocks type 0x01 (§5.2)",
            "key": b64(key),
            "cases": cases,
            "rejected": rejected,
        },
    )


def gen_items() -> None:
    key = pattern(32, 150)
    entries = [
        {
            "v": 1,
            "type": "login",
            "name": "Netflix",
            "username": "tristan@exemple.fr",
            "password": "fake-password-for-tests",
            "urls": ["https://www.netflix.com/login"],
            "notes": "",
            "totp": "",
            "fields": [],
            "passwordChangedAt": "2026-09-01T10:00:00.000Z",
            "favorite": False,
        },
        {
            "v": 1,
            "type": "note",
            "name": "Codes Wi-Fi",
            "notes": "Salon : faux-code-de-test\n" * 20,
        },
        {"v": 1, "type": "login", "name": "Champ futur", "futureField": {"kept": True}},
    ]
    cases = []
    for i, entry in enumerate(entries):
        ctx = contexts.item(USER, ITEM, "personal" if i % 2 == 0 else "agent", i + 1)
        nonce = pattern(24, 80 + i)
        text = json.dumps(entry, ensure_ascii=False, separators=(",", ":"))
        block = blocks.encrypt_block(key, items.pad(text.encode("utf-8")), ctx, _nonce=nonce)
        assert block == items.encrypt_item(key, entry, ctx, _nonce=nonce)
        assert (len(block) - blocks.MIN_BLOCK_BYTES) % items.PAD_BLOCK == 0
        cases.append(
            {
                "key": b64(key),
                "nonce": b64(nonce),
                "context": ctx,
                "json": text,
                "entry": entry,
                "block": b64(block),
            }
        )
    bad_entries = [
        ({"v": 2, "type": "login", "name": "Plus récent"}, "newer entry version"),
        ({"v": 1, "type": "login"}, "missing name"),
        ({"v": 1, "type": "card", "name": "Carte"}, "unknown type"),
        ({"v": 1, "type": "login", "name": "x" * 201}, "name too long"),
    ]
    rejected = []
    ctx = contexts.item(USER, ITEM, "personal", 1)
    for j, (entry, reason) in enumerate(bad_entries):
        text = json.dumps(entry, ensure_ascii=False, separators=(",", ":"))
        block = blocks.encrypt_block(key, items.pad(text.encode()), ctx, _nonce=pattern(24, j))
        must_fail(items.decrypt_item, key, block, ctx)
        rejected.append({"reason": reason, "context": ctx, "block": b64(block)})
    unpadded = blocks.encrypt_block(
        key, b'{"v":1,"type":"note","name":"x"}', ctx, _nonce=pattern(24, 99)
    )
    must_fail(items.decrypt_item, key, unpadded, ctx)
    rejected.append({"reason": "not padded", "context": ctx, "block": b64(unpadded)})
    write(
        "item.json",
        {
            "description": "Entries: JSON, sodium_pad(256), AEAD (§5.7)",
            "key": b64(key),
            "cases": cases,
            "rejected": rejected,
        },
    )


def gen_recovery() -> None:
    cases = []
    for i in range(4):
        rk = pattern(20, 37 * i) if i < 3 else bytes(20)
        rak, rwk = recovery.derive_recovery_keys(rk)
        cases.append(
            {
                "rk": b64(rk),
                "text": recovery.encode_recovery_key(rk),
                "recovery_auth_key": b64(rak),
                "recovery_wrap_key": b64(rwk),
            }
        )
    text = cases[0]["text"]
    raw = text.replace("-", "")
    aliased = raw.replace("1", "l").replace("0", "O")
    accepted = [
        {"input": text.lower(), "rk": cases[0]["rk"]},
        {"input": " ".join(text.split("-")), "rk": cases[0]["rk"]},
        {"input": raw, "rk": cases[0]["rk"]},
        {"input": aliased, "rk": cases[0]["rk"]},
    ]
    for a in accepted:
        assert b64(recovery.decode_recovery_key(a["input"])) == a["rk"]
    last = raw[-1]
    wrong_check = raw[:-1] + ("0" if last != "0" else "1")
    typo = ("0" if raw[0] != "0" else "1") + raw[1:]
    rejected = [
        {"input": wrong_check, "reason": "check group modified"},
        {"input": typo, "reason": "typo in the key"},
        {"input": raw[:-4], "reason": "missing check group"},
        {"input": raw[:-1] + "U", "reason": "U is not in the Crockford alphabet"},
    ]
    for r in rejected:
        must_fail(recovery.decode_recovery_key, r["input"])
    write(
        "recovery.json",
        {
            "description": "Recovery kit (§5.6)",
            "cases": cases,
            "accepted": accepted,
            "rejected": rejected,
        },
    )


def gen_sealed() -> None:
    seed = pattern(32, 222)
    pk, sk = sealed.server_keypair(seed)
    cases = []
    for version in (1, 2):
        ak = pattern(32, 10 * version)
        ctx = contexts.ak_by_sk(USER, version)
        block = sealed.seal_for_server(pk, ak, ctx)
        assert sealed.open_sealed(pk, sk, block, ctx) == ak
        cases.append({"context": ctx, "key": b64(ak), "block": b64(block)})
    other_pk, _ = sealed.server_keypair(pattern(32, 1))
    foreign = sealed.seal_for_server(other_pk, pattern(32, 3), contexts.ak_by_sk(USER, 1))
    good = sealed.seal_for_server(pk, pattern(32, 4), contexts.ak_by_sk(USER, 1))
    tampered = bytearray(good)
    tampered[-1] ^= 1
    rejected = [
        {"reason": "wrong context", "context": contexts.ak_by_sk(USER, 2), "block": b64(good)},
        {
            "reason": "sealed for another server key",
            "context": contexts.ak_by_sk(USER, 1),
            "block": b64(foreign),
        },
        {
            "reason": "modified",
            "context": contexts.ak_by_sk(USER, 1),
            "block": b64(bytes(tampered)),
        },
        {
            "reason": "AEAD type given to sealed",
            "context": contexts.ak_by_sk(USER, 1),
            "block": b64(b"\x01\x01" + good[2:]),
        },
    ]
    for r in rejected:
        from serenity.crypto.encoding import b64url_decode

        must_fail(sealed.open_sealed, pk, sk, b64url_decode(r["block"]), r["context"])
    write(
        "sealed.json",
        {
            "description": "Sealed blocks type 0x02 (§5.3)",
            "server_seed": b64(seed),
            "public_key": b64(pk),
            "key_id": b64(sealed.key_id(pk)),
            "cases": cases,
            "rejected": rejected,
        },
    )


if __name__ == "__main__":
    OUT.mkdir(parents=True, exist_ok=True)
    gen_argon2id()
    gen_kdf()
    gen_contexts()
    gen_aead()
    gen_items()
    gen_recovery()
    gen_sealed()
