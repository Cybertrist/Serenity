/** Login, unlock, lock, logout (docs/crypto.md §7.2, §7.3). */
import type { Api } from "../../lib/api";
import { b64urlEncode } from "../../crypto/encoding";
import { lib } from "../../crypto/sodium";
import type { Keyring } from "../../vault/keyring";
import { deriveForUser, unwrapKeyring } from "./keys";
import type { KeysPayload, LoginPayload, SessionPayload } from "./types";

/** Full login on a new device (or every 60 days): master password + TOTP. */
export async function login(
  api: Api,
  username: string,
  password: string,
  code: string,
): Promise<{ keyring: Keyring; login: LoginPayload }> {
  const { authKey, wrapKey } = await deriveForUser(api, username, password);
  try {
    const out = await api.post<LoginPayload>("/api/auth/login", {
      username,
      auth_key: b64urlEncode(authKey),
      totp: code,
    });
    return {
      keyring: unwrapKeyring(out.user_id, wrapKey, out.uk_by_mk, out.agent_key),
      login: out,
    };
  } finally {
    lib().memzero(authKey);
    lib().memzero(wrapKey);
  }
}

/** Daily unlock on a known device: master password only, proven to the server. */
export async function unlock(
  api: Api,
  username: string,
  password: string,
): Promise<{ keyring: Keyring; session: SessionPayload }> {
  const { authKey, wrapKey } = await deriveForUser(api, username, password);
  try {
    const session = await api.post<SessionPayload>("/api/auth/unlock", {
      auth_key: b64urlEncode(authKey),
    });
    const keys = await api.get<KeysPayload>("/api/auth/keys");
    return {
      keyring: unwrapKeyring(keys.user_id, wrapKey, keys.uk_by_mk, keys.agent_key),
      session,
    };
  } finally {
    lib().memzero(authKey);
    lib().memzero(wrapKey);
  }
}

/** Wipe the keys and tell the server this device is back to the locked level. */
export async function lock(api: Api, keyring: Keyring | null): Promise<void> {
  keyring?.wipe();
  await api.post("/api/auth/lock");
}

export async function logout(api: Api, keyring: Keyring | null): Promise<void> {
  keyring?.wipe();
  await api.post("/api/auth/logout");
}
