"""Behaviour not covered by fixed vectors: randomness, key wrapping, full flows."""

import uuid

import nacl.utils
import pytest

from serenity.crypto import blocks, contexts, items, kdf, recovery, sealed
from serenity.crypto.encoding import b64url_decode, b64url_encode
from serenity.crypto.errors import CryptoError

USER = str(uuid.uuid4())
ITEM = str(uuid.uuid4())


def test_nonces_are_random() -> None:
    key = nacl.utils.random(32)
    ctx = contexts.totp(USER)
    a, b = blocks.encrypt_block(key, b"x", ctx), blocks.encrypt_block(key, b"x", ctx)
    assert a != b
    assert a[2:26] != b[2:26]


def test_blocks_cannot_move_between_items_zones_or_revisions() -> None:
    key = nacl.utils.random(32)
    entry = {"v": 1, "type": "login", "name": "Exemple"}
    block = items.encrypt_item(key, entry, contexts.item(USER, ITEM, "personal", 1))
    for ctx in (
        contexts.item(USER, str(uuid.uuid4()), "personal", 1),
        contexts.item(USER, ITEM, "agent", 1),
        contexts.item(USER, ITEM, "personal", 2),
        contexts.item(str(uuid.uuid4()), ITEM, "personal", 1),
    ):
        with pytest.raises(CryptoError):
            items.decrypt_item(key, block, ctx)


def test_padding_hides_password_length() -> None:
    key = nacl.utils.random(32)
    ctx = contexts.item(USER, ITEM, "personal", 1)
    short = {"v": 1, "type": "login", "name": "A", "password": "x"}
    long = {"v": 1, "type": "login", "name": "A", "password": "x" * 100}
    assert len(items.encrypt_item(key, short, ctx)) == len(items.encrypt_item(key, long, ctx))


def test_signup_and_login_flow() -> None:
    """docs/crypto.md §7.1 then §7.2, on the client side."""
    salt = nacl.utils.random(kdf.SALT_BYTES)
    mk = kdf.derive_master_key("une phrase de passe solide", salt)
    auth_key, mek = kdf.derive_login_keys(mk)
    uk, ak, rk = nacl.utils.random(32), nacl.utils.random(32), nacl.utils.random(20)
    rak, rwk = recovery.derive_recovery_keys(rk)
    uk_by_mek = blocks.wrap_key(mek, uk, contexts.uk_by_mk(USER))
    uk_by_rwk = blocks.wrap_key(rwk, uk, contexts.uk_by_rk(USER))
    ak_by_uk = blocks.wrap_key(uk, ak, contexts.ak_by_uk(USER, 1))
    seed = nacl.utils.random(32)
    pk, sk = sealed.server_keypair(seed)
    ak_sealed = sealed.seal_for_server(pk, ak, contexts.ak_by_sk(USER, 1))

    # Nothing sent to the server contains a key in clear.
    sent = [auth_key, rak, uk_by_mek, uk_by_rwk, ak_by_uk, ak_sealed]
    for secret in (mk, mek, uk, ak, rk, rwk):
        assert all(secret not in blob for blob in sent)
    assert auth_key != mek

    # Login on another device: same password, same salt.
    mk2 = kdf.derive_master_key("une phrase de passe solide", salt)
    auth2, mek2 = kdf.derive_login_keys(mk2)
    assert auth2 == auth_key
    uk2 = blocks.unwrap_key(mek2, uk_by_mek, contexts.uk_by_mk(USER))
    assert blocks.unwrap_key(uk2, ak_by_uk, contexts.ak_by_uk(USER, 1)) == ak
    # Recovery kit.
    typed = recovery.encode_recovery_key(rk).lower().replace("-", " ")
    _, rwk2 = recovery.derive_recovery_keys(recovery.decode_recovery_key(typed))
    assert blocks.unwrap_key(rwk2, uk_by_rwk, contexts.uk_by_rk(USER)) == uk
    # Agent process.
    assert sealed.open_sealed(pk, sk, ak_sealed, contexts.ak_by_sk(USER, 1)) == ak


def test_wrong_password_cannot_unwrap() -> None:
    salt = nacl.utils.random(16)
    _, mek = kdf.derive_login_keys(kdf.derive_master_key("une phrase de passe solide", salt))
    _, wrong = kdf.derive_login_keys(kdf.derive_master_key("une phrase de passe fausse", salt))
    block = blocks.wrap_key(mek, nacl.utils.random(32), contexts.uk_by_mk(USER))
    with pytest.raises(CryptoError):
        blocks.unwrap_key(wrong, block, contexts.uk_by_mk(USER))


def test_error_messages_never_contain_secrets() -> None:
    key = nacl.utils.random(32)
    block = blocks.encrypt_block(key, b"fake-secret-value", contexts.totp(USER))
    with pytest.raises(CryptoError) as exc:
        blocks.decrypt_block(key, block, contexts.uk_by_mk(USER))
    assert "fake-secret-value" not in str(exc.value)
    assert key.hex() not in str(exc.value)


def test_base64url_rejects_padding() -> None:
    assert b64url_encode(b"\xfb\xff") == "-_8"
    assert b64url_decode("-_8") == b"\xfb\xff"
    with pytest.raises(CryptoError):
        b64url_decode("-_8=")
