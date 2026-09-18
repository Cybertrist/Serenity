"""The Python implementation must reproduce every shared vector (docs/crypto.md §10)."""

from collections.abc import Callable
from typing import Any

import pytest

from serenity.crypto import blocks, contexts, items, kdf, recovery, sealed
from serenity.crypto.encoding import b64url_decode as d
from serenity.crypto.encoding import b64url_encode as e
from serenity.crypto.errors import CryptoError

Load = Callable[[str], Any]


def test_argon2id(vectors: Load) -> None:
    data = vectors("argon2id.json")
    for case in data["cases"]:
        params = kdf.KdfParams(memlimit=case["memlimit"], opslimit=case["opslimit"])
        assert kdf.normalize_password(case["password"]).decode() == case["normalized"]
        mk = kdf.derive_master_key(case["password"], d(case["salt"]), params)
        assert e(mk) == case["master_key"]
        auth, mek = kdf.derive_login_keys(mk)
        assert (e(auth), e(mek)) == (case["auth_key"], case["wrap_key"])
    for case in data["rejected"]:
        params = kdf.KdfParams(memlimit=case["memlimit"], opslimit=case["opslimit"])
        with pytest.raises(CryptoError):
            kdf.derive_master_key(case["password"], d(case["salt"]), params)


def test_nfkc_makes_equivalent_passwords_equal(vectors: Load) -> None:
    cases = vectors("argon2id.json")["cases"]
    assert cases[1]["password"] != cases[2]["password"]
    assert cases[1]["normalized"] == cases[2]["normalized"]


def test_kdf(vectors: Load) -> None:
    for case in vectors("kdf.json")["cases"]:
        subkey = kdf.derive_subkey(d(case["key"]), case["id"], case["context"])
        assert e(subkey) == case["subkey"]


def test_contexts(vectors: Load) -> None:
    data = vectors("contexts.json")
    for case in data["cases"]:
        assert getattr(contexts, case["kind"])(*case["args"]) == case["context"]
    for case in data["rejected"]:
        with pytest.raises(CryptoError):
            getattr(contexts, case["kind"])(*case["args"])


def test_aead(vectors: Load) -> None:
    data = vectors("aead.json")
    for case in data["cases"]:
        key, pt = d(case["key"]), d(case["plaintext"])
        block = blocks.encrypt_block(key, pt, case["context"], _nonce=d(case["nonce"]))
        assert e(block) == case["block"]
        assert blocks.decrypt_block(key, d(case["block"]), case["context"]) == pt
    for case in data["rejected"]:
        key = d(case.get("key", data["key"]))
        with pytest.raises(CryptoError):
            blocks.decrypt_block(key, d(case["block"]), case["context"])


def test_items(vectors: Load) -> None:
    data = vectors("item.json")
    for case in data["cases"]:
        key = d(case["key"])
        block = items.encrypt_item(key, case["entry"], case["context"], _nonce=d(case["nonce"]))
        assert e(block) == case["block"]
        assert items.decrypt_item(key, d(case["block"]), case["context"]) == case["entry"]
    for case in data["rejected"]:
        with pytest.raises(CryptoError):
            items.decrypt_item(d(data["key"]), d(case["block"]), case["context"])


def test_recovery(vectors: Load) -> None:
    data = vectors("recovery.json")
    for case in data["cases"]:
        rk = d(case["rk"])
        assert recovery.encode_recovery_key(rk) == case["text"]
        assert recovery.decode_recovery_key(case["text"]) == rk
        rak, rwk = recovery.derive_recovery_keys(rk)
        assert (e(rak), e(rwk)) == (case["recovery_auth_key"], case["recovery_wrap_key"])
    for case in data["accepted"]:
        assert e(recovery.decode_recovery_key(case["input"])) == case["rk"]
    for case in data["rejected"]:
        with pytest.raises(CryptoError):
            recovery.decode_recovery_key(case["input"])


def test_sealed(vectors: Load) -> None:
    data = vectors("sealed.json")
    pk, sk = sealed.server_keypair(d(data["server_seed"]))
    assert e(pk) == data["public_key"]
    assert e(sealed.key_id(pk)) == data["key_id"]
    for case in data["cases"]:
        assert e(sealed.open_sealed(pk, sk, d(case["block"]), case["context"])) == case["key"]
    for case in data["rejected"]:
        with pytest.raises(CryptoError):
            sealed.open_sealed(pk, sk, d(case["block"]), case["context"])
