/** API payloads of /api/auth (see api/serenity/routes/auth.py). */

export interface KdfPayload {
  salt: string;
  memlimit: number;
  opslimit: number;
}

export interface AgentKeyPayload {
  version: number;
  ak_by_uk: string;
}

export interface SessionPayload {
  id: number;
  device: string;
  created_at: string;
  expires_at: string;
  last_seen_at: string;
  unlocked_until: string | null;
  current: boolean;
}

export interface LoginPayload {
  user_id: string;
  username: string;
  uk_by_mk: string;
  agent_key: AgentKeyPayload;
  session: SessionPayload;
}

export interface KeysPayload {
  user_id: string;
  uk_by_mk: string;
  agent_key: AgentKeyPayload;
}

export interface SignupPayload {
  user_id: string;
  totp_secret: string;
  totp_uri: string;
}

export interface RecoverStartPayload {
  user_id: string;
  ticket: string;
  uk_by_rk: string;
  agent_key: AgentKeyPayload;
}

export interface NewPasswordPayload {
  kdf: KdfPayload;
  auth_key: string;
  uk_by_mk: string;
}
