import { AnimatePresence, motion } from "motion/react";
import { useCallback, useMemo, useState } from "react";
import { AgentScreen } from "../../features/agent/AgentScreen";
import { SettingsDialog } from "../../features/account/SettingsDialog";
import { BreachesScreen } from "../../features/breaches/BreachesScreen";
import { CodesScreen } from "../../features/codes/CodesScreen";
import { EntryDialog } from "../../features/vault/EntryDialog";
import { EntryEditor } from "../../features/vault/EntryEditor";
import { GuideDialog } from "../../features/guide/GuideDialog";
import { NotificationsDialog } from "../../features/notifications/NotificationsDialog";
import { VaultScreen } from "../../features/vault/VaultScreen";
import { PERSPECTIVE, SCREEN } from "../../design";
import { useBreaches, useNotifications, useRotations } from "../hooks/queries";
import { useEntries } from "../hooks/useEntries";
import { useSession } from "../session";
import { AddButton } from "./AddButton";
import { AppFrame } from "./AppFrame";
import { ShellContext, type SettingsSection, type ShellApi, type Tab } from "./context";
import { TABS } from "./nav";
import { TabBar } from "./TabBar";

const SCREENS: Record<Tab, () => React.ReactElement> = {
  vault: VaultScreen,
  codes: CodesScreen,
  breaches: BreachesScreen,
  agent: AgentScreen,
};

export function Shell() {
  const session = useSession();
  const [tab, setTab] = useState<Tab>("vault");
  const [settings, setSettings] = useState<SettingsSection | null>(null);
  const [notifications, setNotifications] = useState(false);
  const [guide, setGuide] = useState(false);
  const [openedEntry, setOpenedEntry] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);
  const [scroller, setScroller] = useState<HTMLElement | null>(null);
  /** Which way the screens travel: the tab bar is a row, so the movement follows it. */
  const [direction, setDirection] = useState(1);
  const { byId } = useEntries();
  const breaches = useBreaches();
  const rotations = useRotations();
  const news = useNotifications();

  const go = useCallback(
    (t: Tab) => {
      setTab((current) => {
        const order = TABS.map((entry) => entry.id);
        setDirection(order.indexOf(t) >= order.indexOf(current) ? 1 : -1);
        return t;
      });
      scroller?.scrollTo({ top: 0 });
    },
    [scroller],
  );
  const openSettings = useCallback((section: SettingsSection = "lock") => {
    setSettings(section);
  }, []);
  const openNotifications = useCallback(() => {
    setNotifications(true);
  }, []);
  const openGuide = useCallback(() => {
    setGuide(true);
  }, []);
  const addEntry = useCallback(() => {
    setAdding(true);
  }, []);
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
    }),
    [tab, go, openSettings, openNotifications, openGuide, openedEntry, addEntry],
  );
  const Screen = SCREENS[tab];
  const unread = (news.data ?? []).filter((n) => n.read_at === null).length;
  const badges = {
    breaches: (breaches.data ?? []).length,
    agent: (rotations.data ?? []).filter((r) => r.status === "scheduled").length,
  };
  return (
    <ShellContext.Provider value={api}>
      <AppFrame
        unread={unread}
        onNotifications={openNotifications}
        onGuide={openGuide}
        onSettings={() => {
          // Not `openSettings` directly: the click event would land in its `section` argument.
          openSettings();
        }}
        action={
          <AnimatePresence>
            {tab === "vault" && !session.offline ? <AddButton onClick={addEntry} /> : null}
          </AnimatePresence>
        }
        footer={<TabBar tab={tab} onChange={go} badges={badges} />}
      >
        <main
          ref={setScroller}
          className="relative min-h-0 flex-1 overflow-y-auto overflow-x-hidden px-4 pb-24 pt-4 sm:px-6"
          style={{ perspective: PERSPECTIVE }}
        >
          <AnimatePresence mode="wait" custom={direction}>
            <motion.div
              key={tab}
              custom={direction}
              variants={SCREEN}
              initial="initial"
              animate="animate"
              exit="exit"
              style={{ transformStyle: "preserve-3d" }}
            >
              <Screen />
            </motion.div>
          </AnimatePresence>
        </main>
        {/* Where the toasts and the dialogs land: inside the square, never over the window. */}
        <div id="toast-slot" className="pointer-events-none absolute inset-0 z-30" />
        <div id="dialog-slot" className="absolute inset-0 z-40 empty:pointer-events-none" />
      </AppFrame>
      <EntryDialog
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
