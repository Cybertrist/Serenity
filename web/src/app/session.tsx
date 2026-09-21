/**
 * App session: which screen (welcome, login, locked, unlocked), the in-memory Keyring and the
 * vault state. Keys never leave this module's memory; lock() wipes them.
 */
import { useQueryClient } from "@tanstack/react-query";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { deriveWith, unwrapKeyring } from "../features/account/keys";
import * as account from "../features/account";
import type { KeysPayload, LoginPayload } from "../features/account/types";
import { forgetPwned } from "../features/breaches/pwned";
import { Api, ApiError } from "../lib/api";
import { subscribe, type NotificationEvent } from "../lib/events";
import { AutoLock } from "../vault/autolock";
import type { Keyring } from "../vault/keyring";
import { sync } from "../vault/operations";
import { VaultState } from "../vault/state";
import { clearCache, loadCache, saveCache, type CachedVault } from "./cache";
import { lockMinutes } from "./prefs";

export type Phase = "booting" | "welcome" | "login" | "locked" | "unlocked";

interface Session {
  api: Api;
  phase: Phase;
  username: string | null;
  keyring: Keyring | null;
  vault: VaultState;
  /** Bumped whenever the vault state changes, to re-render. */
  version: number;
  offline: boolean;
  notifications: NotificationEvent[];
  refresh: () => Promise<void>;
  touch: () => void;
  enter: (keyring: Keyring, login: LoginPayload | null, username: string) => Promise<void>;
  /** `beforeEnter` runs once the password is proven, before the app opens: the lock animation. */
  unlock: (password: string, beforeEnter?: () => Promise<void>) => Promise<void>;
  lock: () => Promise<void>;
  logout: () => Promise<void>;
  showLogin: () => void;
}

const SessionContext = createContext<Session | null>(null);

export function useSession(): Session {
  const value = useContext(SessionContext);
  if (!value) throw new Error("SessionProvider missing");
  return value;
}

export function SessionProvider({ children }: { children: ReactNode }) {
  const api = useMemo(() => new Api(""), []);
  const queryClient = useQueryClient();
  const [phase, setPhase] = useState<Phase>("booting");
  const [username, setUsername] = useState<string | null>(null);
  const [keyring, setKeyring] = useState<Keyring | null>(null);
  const [version, setVersion] = useState(0);
  const [offline, setOffline] = useState(false);
  const [notifications, setNotifications] = useState<NotificationEvent[]>([]);
  const vault = useRef(new VaultState());
  const autolock = useRef<AutoLock | null>(null);

  const persist = useCallback(
    async (keys: KeysPayload, user: string) => {
      const kdf = await api.post<CachedVault["kdf"]>("/api/auth/prelogin", { username: user });
      await saveCache({
        username: user,
        userId: keys.user_id,
        kdf,
        ukByMk: keys.uk_by_mk,
        agentKey: keys.agent_key,
        seq: vault.current.seq,
        items: [...vault.current.items.values()],
        savedAt: new Date().toISOString(),
      });
    },
    [api],
  );

  const refresh = useCallback(async () => {
    await sync(api, vault.current);
    setVersion((v) => v + 1);
    const cached = await loadCache();
    if (cached)
      await saveCache({
        ...cached,
        seq: vault.current.seq,
        items: [...vault.current.items.values()],
      });
  }, [api]);

  const wipe = useCallback(() => {
    autolock.current?.stop();
    setKeyring((current) => {
      current?.wipe();
      return null;
    });
    forgetPwned();
    queryClient.clear();
  }, [queryClient]);

  const lock = useCallback(async () => {
    wipe();
    setPhase("locked");
    try {
      await api.post("/api/auth/lock");
    } catch {
      // Offline: the keys are wiped anyway.
    }
  }, [api, wipe]);

  const startAutolock = useCallback(() => {
    autolock.current?.stop();
    const guard = new AutoLock(() => void lock(), lockMinutes() * 60_000);
    guard.start();
    autolock.current = guard;
  }, [lock]);

  const enter = useCallback(
    async (keys: Keyring, login: LoginPayload | null, user: string) => {
      setKeyring(keys);
      setUsername(user);
      setPhase("unlocked");
      setOffline(false);
      startAutolock();
      vault.current = new VaultState();
      await refresh();
      const payload: KeysPayload = login
        ? { user_id: login.user_id, uk_by_mk: login.uk_by_mk, agent_key: login.agent_key }
        : await api.get<KeysPayload>("/api/auth/keys");
      await persist(payload, user);
    },
    [api, persist, refresh, startAutolock],
  );

  const unlock = useCallback(
    async (password: string, beforeEnter?: () => Promise<void>) => {
      const cached = await loadCache();
      const user = username ?? cached?.username;
      if (!user) throw new Error("identifiant inconnu");
      try {
        const { keyring: keys } = await account.unlock(api, user, password);
        await beforeEnter?.();
        await enter(keys, null, user);
      } catch (e) {
        // Offline: unlock locally from the encrypted cache, read-only.
        if (!(e instanceof TypeError) || !cached) throw e;
        const { wrapKey } = deriveWith(password, cached.kdf);
        const keys = unwrapKeyring(cached.userId, wrapKey, cached.ukByMk, cached.agentKey);
        await beforeEnter?.();
        vault.current = new VaultState();
        vault.current.apply({ seq: cached.seq, items: cached.items });
        setKeyring(keys);
        setUsername(user);
        setOffline(true);
        setPhase("unlocked");
        setVersion((v) => v + 1);
        startAutolock();
      }
    },
    [api, enter, startAutolock, username],
  );

  const logout = useCallback(async () => {
    wipe();
    try {
      await api.post("/api/auth/logout");
    } catch {
      // Offline.
    }
    await clearCache();
    vault.current = new VaultState();
    setUsername(null);
    setPhase("login");
  }, [api, wipe]);

  // Boot: session still valid -> locked screen; otherwise signup or login.
  useEffect(() => {
    void (async () => {
      const cached = await loadCache();
      try {
        const me = await api.get<{ username: string }>("/api/auth/me");
        setUsername(me.username);
        setPhase("locked");
      } catch (e) {
        if (e instanceof ApiError) {
          const status = await api.get<{ registration_open: boolean }>("/api/auth/status");
          setPhase(status.registration_open ? "welcome" : "login");
        } else if (cached) {
          setUsername(cached.username);
          setPhase("locked");
        } else {
          setPhase("login");
        }
      }
    })();
  }, [api]);

  // Real-time notifications while unlocked (ADR-005). The vault is pulled too: when the agent
  // rotates a password, the entry changes on the server, and an open client showed the old one
  // until something else happened to sync.
  useEffect(() => {
    if (phase !== "unlocked" || offline) return;
    return subscribe((event) => {
      setNotifications((all) => [event, ...all].slice(0, 50));
      void queryClient.invalidateQueries();
      void refresh();
    });
  }, [phase, offline, queryClient, refresh]);

  // Activity pushes the automatic lock back.
  useEffect(() => {
    if (phase !== "unlocked") return;
    const guard = autolock.current;
    return guard ? guard.attach(window) : undefined;
  }, [phase]);

  const value: Session = {
    api,
    phase,
    username,
    keyring,
    vault: vault.current,
    version,
    offline,
    notifications,
    refresh,
    touch: () => autolock.current?.activity(),
    enter,
    unlock,
    lock,
    logout,
    showLogin: () => {
      setPhase("login");
    },
  };
  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>;
}
