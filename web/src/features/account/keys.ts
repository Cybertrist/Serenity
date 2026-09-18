/** Key derivation and wrapping shared by the account flows (docs/crypto.md §7). */
import type { Api } from "../../lib/api";
import * as blocks from "../../crypto/blocks";
import * as contexts from "../../crypto/contexts";
import { b64urlDecode, b64urlEncode } from "../../crypto/encoding";
import * as kdf from "../../crypto/kdf";
import { lib } from "../../crypto/sodium";
import { Keyring } from "../../vault/keyring";
import type { AgentKeyPayload, KdfPayload, NewPasswordPayload } from "./types";

export interface LoginKeys {
  authKey: Uint8Array;
  wrapKey: Uint8Array;
}

/** Prelogin, then Argon2id with the floor enforced (a server cannot weaken it). */
export async function deriveForUser(
  api: Api,
  username: string,
  password: string,
): Promise<LoginKeys> {
  const pre = await api.post<KdfPayload>("/api/auth/prelogin", { username });
  return deriveWith(password, pre);
}

export function deriveWith(password: string, params: KdfPayload): LoginKeys {
  const masterKey = kdf.deriveMasterKey(password, b64urlDecode(params.salt), params);
  try {
    return kdf.deriveLoginKeys(masterKey);
  } finally {
    lib().memzero(masterKey);
  }
}

/** New salt, AuthKey and UK wrapping for a (new) master password. UK itself does not change. */
export function newPassword(
  userId: string,
  password: string,
  uk: Uint8Array,
): {
  payload: NewPasswordPayload;
  authKey: Uint8Array;
} {
  const salt = lib().randombytes_buf(kdf.SALT_BYTES);
  const params = { salt: b64urlEncode(salt), ...kdf.DEFAULT_PARAMS };
  const { authKey, wrapKey } = deriveWith(password, params);
  const ukByMk = blocks.wrapKey(wrapKey, uk, contexts.ukByMk(userId));
  lib().memzero(wrapKey);
  return {
    payload: { kdf: params, auth_key: b64urlEncode(authKey), uk_by_mk: b64urlEncode(ukByMk) },
    authKey,
  };
}

/** UK with MEK, then AK with UK. A failure means a wrong password or a tampered block. */
export function unwrapKeyring(
  userId: string,
  wrapKey: Uint8Array,
  ukByMk: string,
  agentKey: AgentKeyPayload,
): Keyring {
  const uk = blocks.unwrapKey(wrapKey, b64urlDecode(ukByMk), contexts.ukByMk(userId));
  return keyringFromUk(userId, uk, agentKey);
}

export function keyringFromUk(userId: string, uk: Uint8Array, agentKey: AgentKeyPayload): Keyring {
  const ak = blocks.unwrapKey(
    uk,
    b64urlDecode(agentKey.ak_by_uk),
    contexts.akByUk(userId, agentKey.version),
  );
  return new Keyring(userId, uk, agentKey.version, ak);
}
