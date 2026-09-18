/** Account creation (docs/crypto.md §7.1). The server only receives AuthKey, RAK and blocks. */
import type { Api } from "../../lib/api";
import * as blocks from "../../crypto/blocks";
import * as contexts from "../../crypto/contexts";
import { b64urlDecode, b64urlEncode } from "../../crypto/encoding";
import * as recovery from "../../crypto/recovery";
import * as sealed from "../../crypto/sealed";
import { lib } from "../../crypto/sodium";
import type { Keyring } from "../../vault/keyring";
import { keyringFromUk, newPassword } from "./keys";
import type { LoginPayload, SignupPayload } from "./types";

export interface PendingSignup {
  userId: string;
  /** Shown once, to add Serenity to the authenticator app. */
  totpSecret: string;
  totpUri: string;
  /** Shown once on the recovery kit screen, then forgotten. */
  recoveryKit: string;
  /** Second step: the first TOTP code activates the account and opens the session. */
  confirm(code: string): Promise<{ keyring: Keyring; login: LoginPayload }>;
}

export async function signup(api: Api, username: string, password: string): Promise<PendingSignup> {
  const s = lib();
  const userId = crypto.randomUUID();
  const uk = s.randombytes_buf(32);
  const ak = s.randombytes_buf(32);
  const rk = s.randombytes_buf(recovery.RK_BYTES);
  const rec = recovery.deriveRecoveryKeys(rk);
  const server = await api.get<{ public_key: string; key_id: string }>("/api/crypto/server-key");
  const { payload } = newPassword(userId, password, uk);
  const body = {
    user_id: userId,
    username,
    ...payload,
    recovery_auth_key: b64urlEncode(rec.authKey),
    uk_by_rk: b64urlEncode(blocks.wrapKey(rec.wrapKey, uk, contexts.ukByRk(userId))),
    ak_by_uk: b64urlEncode(blocks.wrapKey(uk, ak, contexts.akByUk(userId, 1))),
    ak_sealed: b64urlEncode(
      sealed.sealForServer(b64urlDecode(server.public_key), ak, contexts.akBySk(userId, 1)),
    ),
  };
  const out = await api.post<SignupPayload>("/api/auth/signup", body);
  const recoveryKit = recovery.encodeRecoveryKey(rk);
  s.memzero(rk);
  s.memzero(rec.wrapKey);
  s.memzero(ak);
  return {
    userId: out.user_id,
    totpSecret: out.totp_secret,
    totpUri: out.totp_uri,
    recoveryKit,
    async confirm(code: string) {
      const login = await api.post<LoginPayload>("/api/auth/signup/confirm", {
        user_id: userId,
        totp: code,
      });
      return { keyring: keyringFromUk(userId, uk, login.agent_key), login };
    },
  };
}
