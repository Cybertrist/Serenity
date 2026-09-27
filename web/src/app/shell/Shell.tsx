import { AnimatePresence, motion } from "motion/react";
import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { AgentScreen } from "../../features/agent/AgentScreen";
import { SettingsDialog } from "../../features/account/SettingsDialog";
import { BreachesScreen } from "../../features/breaches/BreachesScreen";
import { CodesScreen } from "../../features/codes/CodesScreen";
import { EntryDialog } from "../../features/vault/EntryDialog";
import { EntryEditor } from "../../features/vault/EntryEditor";
import { GuideDialog } from "../../features/guide/GuideDialog";
import { NotificationsDialog } from "../../features/notifications/NotificationsDialog";
import { VaultScreen } from "../../features/vault/VaultScreen";
import { Aurora, SCREEN, setBaseMood } from "../../design";
import { desktop } from "../desktop";
import { useEntries } from "../hooks/useEntries";
import { CommandPalette } from "../palette/CommandPalette";
import { useSession } from "../session";
import { useShortcut } from "../shortcuts";
import { AddButton } from "./AddButton";
import {
  ShellContext,
  WIDE_FROM,
  type Form,
  type SettingsSection,
  type ShellApi,
  type Tab,
  type VaultZone,
} from "./context";
import { GeneratorDialog } from "./GeneratorDialog";
import { TABS } from "./nav";
import { Sidebar } from "./Sidebar";
import { StatusBar } from "./StatusBar";
import { TabBar } from "./TabBar";
import { TitleBar } from "./TitleBar";
import { TopBar } from "./TopBar";
import { useBaseMood, useTabMood, useUnread } from "./useShellData";

const SCREENS: Record<Tab, () => React.ReactElement> = {
  vault: VaultScreen,
  codes: CodesScreen,
  breaches: BreachesScreen,
  agent: AgentScreen,
};

/** Width of the app, kept up to date: the layout switches on it, not on the window. */
function useWidth(target: HTMLElement | null): number {
  const [width, setWidth] = useState(() =>
    typeof window !== "undefined" ? window.innerWidth : 1024,
  );
  useLayoutEffect(() => {
    if (!target) return;
    setWidth(target.clientWidth);
    const observer = new ResizeObserver(([entry]) => {
      if (entry) setWidth(Math.round(entry.contentRect.width));
    });
    observer.observe(target);
    return () => {
      observer.disconnect();
    };
  }, [target]);
  return width;
}

/**
 * The open vault, full window. Three forms from one tree:
 * - mobile (< 900 px): the screen, the tabs at the bottom under the thumb;
 * - web: a sidebar, a top bar with the search, the screen, a status bar at the foot;
 * - desktop (Electron): the same, under the app's own title bar, which carries the search.
 * The light behind (Aurora) takes the mood of the vault; screens can ask for theirs (useMood).
 */
export function Shell() {
  const session = useSession();
  const [tab, setTab] = useState<Tab>("vault");
  const [settings, setSettings] = useState<SettingsSection | null>(null);
  const [notifications, setNotifications] = useState(false);
  const [guide, setGuide] = useState(false);
  const [generator, setGenerator] = useState(false);
  const [palette, setPalette] = useState<string | null>(null);
  const [openedEntry, setOpenedEntry] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);
  const [vaultZone, setVaultZone] = useState<VaultZone>("all");
  const [root, setRoot] = useState<HTMLDivElement | null>(null);
  const scroller = useRef<HTMLElement>(null);
  const { byId } = useEntries();
  const unread = useUnread();
  const baseMood = useBaseMood();
  const tabMood = useTabMood(tab);
  const width = useWidth(root);
  const isDesktop = desktop() !== null;
  const wide = width >= WIDE_FROM;
  const form: Form = !wide ? "mobile" : isDesktop ? "desktop" : "web";

  useEffect(() => {
    setBaseMood(tabMood ?? baseMood);
  }, [tabMood, baseMood]);

  const go = useCallback((t: Tab) => {
    setTab(t);
    scroller.current?.scrollTo({ top: 0 });
  }, []);
  const openSettings = useCallback((section: SettingsSection = "lock") => {
    setSettings(section);
  }, []);
  const openNotifications = useCallback(() => {
    setNotifications(true);
  }, []);
  const openGuide = useCallback(() => {
    setGuide(true);
  }, []);
  const openGenerator = useCallback(() => {
    setGenerator(true);
  }, []);
  const openPalette = useCallback((query = "") => {
    setPalette(query);
  }, []);
  const addEntry = useCallback(() => {
    if (!session.offline) setAdding(true);
  }, [session.offline]);
  const lock = useCallback(() => {
    void session.lock();
  }, [session]);

  const api: ShellApi = useMemo(
    () => ({
      tab,
      go,
      openSettings,
      openNotifications,
      openGuide,
      openedEntry,
      openEntry: setOpenedEntry,
      addEntry,
      openPalette,
      openGenerator,
      vaultZone,
      setVaultZone,
      lock,
      form,
      width,
    }),
    [
      tab,
      go,
      openSettings,
      openNotifications,
      openGuide,
      openedEntry,
      addEntry,
      openPalette,
      openGenerator,
      vaultZone,
      lock,
      form,
      width,
    ],
  );

  // The keyboard, everywhere in the open vault (web/src/app/shortcuts.ts).
  useShortcut(
    "mod+k",
    () => {
      setPalette((p) => (p === null ? "" : null));
    },
    { inDialog: true },
  );
  useShortcut("/", () => {
    setPalette("");
  });
  useShortcut("mod+n", addEntry);
  useShortcut("mod+l", lock, { inDialog: true });
  useShortcut("mod+,", () => {
    openSettings();
  });
  // G then V, C, F or A: the second key says where to go.
  useShortcut(
    TABS.map((t) => t.keys),
    (event) => {
      const target = TABS.find((t) => t.keys.endsWith(event.key.toLowerCase()));
      if (target) go(target.id);
    },
  );

  const Screen = SCREENS[tab];
  return (
    <ShellContext.Provider value={api}>
      <motion.div
        ref={setRoot}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.5, ease: [0.2, 0.8, 0.2, 1] }}
        className="@container relative flex h-dvh w-full flex-col overflow-hidden bg-bg text-text"
      >
        {isDesktop ? (
          <TitleBar
            unread={unread}
            onSearch={() => {
              openPalette();
            }}
            onNotifications={openNotifications}
          />
        ) : null}
        <div className="relative flex min-h-0 flex-1">
          {wide ? <Sidebar brand={!isDesktop} /> : null}
          <div className="relative flex min-w-0 flex-1 flex-col">
            <Aurora revealed />
            {wide && !isDesktop ? <TopBar /> : null}
            <main
              ref={scroller}
              className={`relative z-[1] min-h-0 flex-1 overflow-y-auto overflow-x-hidden ${
                wide
                  ? `px-7 pb-24 @[1180px]:px-10 ${isDesktop ? "pt-7" : "pt-2"}`
                  : "px-[18px] pb-[calc(160px+env(safe-area-inset-bottom))] pt-[max(18px,env(safe-area-inset-top))]"
              }`}
            >
              <AnimatePresence mode="wait">
                <motion.div
                  key={tab}
                  variants={SCREEN}
                  initial="initial"
                  animate="animate"
                  exit="exit"
                  className="app-rise mx-auto w-full max-w-[1120px]"
                >
                  <Screen />
                </motion.div>
              </AnimatePresence>
            </main>
            <AnimatePresence>
              {tab === "vault" && !session.offline ? (
                <AddButton onClick={addEntry} wide={wide} />
              ) : null}
            </AnimatePresence>
            {wide ? <StatusBar /> : <TabBar />}
          </div>
          {/* Where the toasts and the dialogs land: over the app, under the title bar. */}
          <div id="toast-slot" className="pointer-events-none absolute inset-0 z-30" />
          <div id="dialog-slot" className="absolute inset-0 z-40 empty:pointer-events-none" />
        </div>
      </motion.div>
      <CommandPalette
        open={palette !== null}
        initialQuery={palette ?? ""}
        onClose={() => {
          setPalette(null);
        }}
      />
      <EntryDialog
        key={openedEntry ?? "none"}
        entry={openedEntry ? (byId.get(openedEntry) ?? null) : null}
        onClose={() => {
          setOpenedEntry(null);
        }}
      />
      {adding ? (
        <EntryEditor
          open
          onClose={() => {
            setAdding(false);
          }}
        />
      ) : null}
      <GeneratorDialog
        open={generator}
        onClose={() => {
          setGenerator(false);
        }}
      />
      <GuideDialog
        open={guide}
        onClose={() => {
          setGuide(false);
        }}
      />
      <NotificationsDialog
        open={notifications}
        onClose={() => {
          setNotifications(false);
        }}
      />
      <SettingsDialog
        open={settings !== null}
        section={settings ?? "lock"}
        onClose={() => {
          setSettings(null);
        }}
      />
    </ShellContext.Provider>
  );
}
