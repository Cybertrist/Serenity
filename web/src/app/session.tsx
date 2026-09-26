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
import type { KeysPayload, LoginPayload, SessionPayload } from "../features/account/types";
import { forgetPwned } from "../features/breaches/pwned";
import { Api, ApiError } from "../lib/api";
import { subscribe, type NotificationEvent } from "../lib/events";
import { AutoLock } from "../vault/autolock";
import type { Keyring } from "../vault/keyring";
import { sync } from "../vault/operations";
import { VaultState } from "../vault/state";
import { clearCache, loadCache, saveCache, type CachedVault } from "./cache";
import { clearClipboard } from "./clipboard";
import { lockMinutes } from "./prefs";

export type Phase = "booting" | "welcome" | "login" | "locked" | "unlocked";

interface MePayload {
  user_id: string;
  username: string;
  session: SessionPayload;
}

/** While offline, how often the server is tried again (the `online` event is not enough). */
const RECONNECT_EVERY_MS = 60_000;

interface Session {
  api: Api;
  phase: Phase;
  username: string | null;
  keyring: Keyring | null;
  vault: VaultState;
  /** Bumped whenever the vault state changes, to re-render. */
  version: number;
  offline: boolean;
  /**
   * Offline unlock, then the server came back: the vault is synced again (read-only), but the
   * server session is still locked, so writes need a real unlock. The UI can offer to lock and
   * unlock again.
   */
  needsUnlock: boolean;
  notifications: NotificationEvent[];
  refresh: () => Promise<void>;
  /**
   * Re-reads the wrapped keys and KDF parameters and saves them in the offline cache. Call it
   * after a master password change, or the offline unlock would still expect the old password.
   */
  refreshKeysCache: () => Promise<void>;
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

/** The server cannot be reached (network down, or a proxy answering in its place). */
function unreachable(error: unknown): boolean {
  return error instanceof TypeError || (error instanceof ApiError && error.status >= 500);
}

export function SessionProvider({ children }: { children: ReactNode }) {
  const api = useMemo(() => new Api(""), []);
  const queryClient = useQueryClient();
  const [phase, setPhase] = useState<Phase>("booting");
  const [username, setUsername] = useState<string | null>(null);
  const [keyring, setKeyring] = useState<Keyring | null>(null);
  const [version, setVersion] = useState(0);
  const [offline, setOffline] = useState(false);
  const [needsUnlock, setNeedsUnlock] = useState(false);
  const [notifications, setNotifications] = useState<NotificationEvent[]>([]);
  const vault = useRef(new VaultState());
  // The keyring the app holds right now, so that wiping it never waits for a render.
  const keyringRef = useRef<Keyring | null>(null);
  const phaseRef = useRef<Phase>(phase);
  phaseRef.current = phase;
  const offlineRef = useRef(offline);
  offlineRef.current = offline;
  // One guard for the whole life of the app: its listeners are attached once, and restarting it
  // after each unlock keeps them. `lockRef` always points at the latest lock().
  const lockRef = useRef<() => Promise<void>>(() => Promise.resolve());
  const autolock = useRef<AutoLock | null>(null);
  autolock.current ??= new AutoLock(() => void lockRef.current());
  const guard = autolock.current;

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

  const refreshKeysCache = useCallback(async () => {
    if (!username) return;
    await persist(await api.get<KeysPayload>("/api/auth/keys"), username);
  }, [api, persist, username]);

  /** Takes a new keyring; the one it replaces, if any, is wiped right away. */
  const adopt = useCallback((keys: Keyring) => {
    const previous = keyringRef.current;
    if (previous && previous !== keys) previous.wipe();
    keyringRef.current = keys;
    setKeyring(keys);
  }, []);

  /** Synchronous: the keys are gone when this returns, whatever React renders next. */
  const wipe = useCallback(() => {
    guard.stop();
    keyringRef.current?.wipe();
    keyringRef.current = null;
    setKeyring(null);
    setNeedsUnlock(false);
    forgetPwned();
    queryClient.clear();
    void clearClipboard();
  }, [guard, queryClient]);

  const lock = useCallback(async () => {
    wipe();
    setPhase("locked");
    try {
      await api.post("/api/auth/lock");
    } catch {
      // Offline: the keys are wiped anyway.
    }
  }, [api, wipe]);

  useEffect(() => {
    lockRef.current = lock;
  }, [lock]);

  /** The device session is gone on the server (expired or revoked): back to the login. */
  const expire = useCallback(() => {
    wipe();
    setOffline(false);
    setPhase("login");
  }, [wipe]);

  useEffect(() => {
    api.onUnauthorized = () => {
      // On the login, welcome and boot screens, a 401 is an ordinary answer.
      if (phaseRef.current === "unlocked" || phaseRef.current === "locked") expire();
    };
    return () => {
      api.onUnauthorized = null;
    };
  }, [api, expire]);

  const startAutolock = useCallback(() => {
    guard.start(lockMinutes() * 60_000);
  }, [guard]);

  const enter = useCallback(
    async (keys: Keyring, login: LoginPayload | null, user: string) => {
      adopt(keys);
      setUsername(user);
      setPhase("unlocked");
      setOffline(false);
      setNeedsUnlock(false);
      startAutolock();
      vault.current = new VaultState();
      await refresh();
      const payload: KeysPayload = login
        ? { user_id: login.user_id, uk_by_mk: login.uk_by_mk, agent_key: login.agent_key }
        : await api.get<KeysPayload>("/api/auth/keys");
      await persist(payload, user);
    },
    [adopt, api, persist, refresh, startAutolock],
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
        // Offline (or a proxy error page): unlock locally from the encrypted cache, read-only.
        if (!unreachable(e) || !cached) throw e;
        const { wrapKey } = deriveWith(password, cached.kdf);
        const keys = unwrapKeyring(cached.userId, wrapKey, cached.ukByMk, cached.agentKey);
        await beforeEnter?.();
        vault.current = new VaultState();
        vault.current.apply({ seq: cached.seq, items: cached.items });
        adopt(keys);
        setUsername(user);
        setOffline(true);
        setNeedsUnlock(false);
        setPhase("unlocked");
        setVersion((v) => v + 1);
        startAutolock();
      }
    },
    [adopt, api, enter, startAutolock, username],
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
      let cached = await loadCache();
      const fromCache = () => {
        if (cached) {
          setUsername(cached.username);
          setPhase("locked");
        } else {
          setPhase("login");
        }
      };
      try {
        const me = await api.get<MePayload>("/api/auth/me");
        setUsername(me.username);
        setPhase("locked");
        return;
      } catch (e) {
        if (!(e instanceof ApiError) || e.status >= 500) {
          fromCache();
          return;
        }
        if (e.status === 401 || e.status === 403) {
          // The session is gone (expired or this device was revoked): drop its offline copy.
          await clearCache();
          cached = null;
        }
      }
      try {
        const status = await api.get<{ registration_open: boolean }>("/api/auth/status");
        setPhase(status.registration_open ? "welcome" : "login");
      } catch {
        fromCache();
      }
    })();
  }, [api]);

  // Offline unlock: when the server answers again, sync, and leave the offline mode if the
  // server session is still unlocked. Otherwise flag that a real unlock is needed to write.
  const reconnect = useCallback(async () => {
    if (phaseRef.current !== "unlocked" || !offlineRef.current) return;
    let me: MePayload;
    try {
      me = await api.get<MePayload>("/api/auth/me");
    } catch (e) {
      if (e instanceof ApiError && (e.status === 401 || e.status === 403)) expire();
      return;
    }
    try {
      await refresh();
    } catch {
      return;
    }
    // The user may have locked while the sync ran.
    if ((phaseRef.current as Phase) !== "unlocked") return;
    const until = me.session.unlocked_until ? Date.parse(me.session.unlocked_until) : NaN;
    if (until > Date.now()) {
      setOffline(false);
      setNeedsUnlock(false);
    } else {
      setNeedsUnlock(true);
    }
  }, [api, expire, refresh]);

  useEffect(() => {
    if (phase !== "unlocked" || !offline) return;
    const onOnline = () => void reconnect();
    window.addEventListener("online", onOnline);
    const timer = setInterval(onOnline, RECONNECT_EVERY_MS);
    return () => {
      window.removeEventListener("online", onOnline);
      clearInterval(timer);
    };
  }, [phase, offline, reconnect]);

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

  // Activity pushes the automatic lock back. Attached once: the guard ignores events while it
  // is stopped, and keeps these listeners across restarts.
  useEffect(() => guard.attach(window), [guard]);

  const value: Session = {
    api,
    phase,
    username,
    keyring,
    vault: vault.current,
    version,
    offline,
    needsUnlock,
    notifications,
    refresh,
    refreshKeysCache,
    touch: () => {
      guard.activity();
    },
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
