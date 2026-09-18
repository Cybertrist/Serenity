/** Master password change and recovery with the kit (docs/crypto.md §7.7, §7.8). */
import type { Api } from "../../lib/api";
import * as blocks from "../../crypto/blocks";
import * as contexts from "../../crypto/contexts";
import { b64urlDecode, b64urlEncode } from "../../crypto/encoding";
import * as recovery from "../../crypto/recovery";
import { lib } from "../../crypto/sodium";
import type { Keyring } from "../../vault/keyring";
import { deriveForUser, keyringFromUk, newPassword } from "./keys";
import type { LoginPayload, RecoverStartPayload } from "./types";

/** Needs an unlocked vault. Entries are untouched: UK stays the same. */
export async function changePassword(
  api: Api,
  keyring: Keyring,
  username: string,
  currentPassword: string,
  nextPassword: string,
  code: string,
): Promise<void> {
  const current = await deriveForUser(api, username, currentPassword);
  const next = newPassword(keyring.userId, nextPassword, keyring.userKey());
  try {
    await api.post("/api/auth/password", {
      current_auth_key: b64urlEncode(current.authKey),
      totp: code,
      new: next.payload,
    });
  } finally {
    lib().memzero(current.authKey);
    lib().memzero(current.wrapKey);
    lib().memzero(next.authKey);
  }
}

/** Returns the unlocked keyring and the NEW recovery kit (the old one stops working). */
export async function recover(
  api: Api,
  username: string,
  kitText: string,
  code: string,
  nextPassword: string,
): Promise<{ keyring: Keyring; recoveryKit: string; login: LoginPayload }> {
  const s = lib();
  const rec = recovery.deriveRecoveryKeys(recovery.decodeRecoveryKey(kitText));
  const start = await api.post<RecoverStartPayload>("/api/auth/recover/start", {
    username,
    recovery_auth_key: b64urlEncode(rec.authKey),
    totp: code,
  });
  const userId = start.user_id;
  const uk = blocks.unwrapKey(rec.wrapKey, b64urlDecode(start.uk_by_rk), contexts.ukByRk(userId));
  s.memzero(rec.wrapKey);
  const next = newPassword(userId, nextPassword, uk);
  const rk = s.randombytes_buf(recovery.RK_BYTES);
  const rec2 = recovery.deriveRecoveryKeys(rk);
  const login = await api.post<LoginPayload>("/api/auth/recover/complete", {
    ticket: start.ticket,
    new: next.payload,
    recovery_auth_key: b64urlEncode(rec2.authKey),
    uk_by_rk: b64urlEncode(blocks.wrapKey(rec2.wrapKey, uk, contexts.ukByRk(userId))),
  });
  const recoveryKit = recovery.encodeRecoveryKey(rk);
  s.memzero(rk);
  s.memzero(rec2.wrapKey);
  return { keyring: keyringFromUk(userId, uk, login.agent_key), recoveryKit, login };
}
