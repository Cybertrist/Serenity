import { AnimatePresence, motion } from "motion/react";
import { useCallback, useMemo, useState } from "react";
import { AgentScreen } from "../../features/agent/AgentScreen";
import { SettingsSheet } from "../../features/account/SettingsSheet";
import { BreachesScreen } from "../../features/breaches/BreachesScreen";
import { JournalScreen } from "../../features/logs/JournalScreen";
import { EntrySheet } from "../../features/vault/EntrySheet";
import { VaultScreen } from "../../features/vault/VaultScreen";
import { EASE } from "../../design";
import { useBreaches, useRotations } from "../hooks/queries";
import { useEntries } from "../hooks/useEntries";
import { ShellContext, type ShellApi, type Tab } from "./context";
import { TabBar } from "./TabBar";

const SCREENS: Record<Tab, () => React.ReactElement> = {
  vault: VaultScreen,
  breaches: BreachesScreen,
  logs: JournalScreen,
  agent: AgentScreen,
};

export function Shell() {
  const [tab, setTab] = useState<Tab>("vault");
  const [settings, setSettings] = useState(false);
  const [openedEntry, setOpenedEntry] = useState<string | null>(null);
  const { byId } = useEntries();
  const breaches = useBreaches();
  const rotations = useRotations();
  const go = useCallback((t: Tab) => {
    setTab(t);
    window.scrollTo({ top: 0 });
  }, []);
  const api: ShellApi = useMemo(
    () => ({
      tab,
      go,
      openSettings: () => {
        setSettings(true);
      },
      openedEntry,
      openEntry: setOpenedEntry,
    }),
    [tab, go, openedEntry],
  );
  const Screen = SCREENS[tab];
  const badges = {
    breaches: (breaches.data ?? []).length,
    agent: (rotations.data ?? []).filter((r) => r.status === "scheduled").length,
  };
  return (
    <ShellContext.Provider value={api}>
      <div className="mx-auto min-h-dvh w-full max-w-[480px] pb-[120px]">
        <AnimatePresence mode="wait">
          <motion.div
            key={tab}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={EASE}
          >
            <Screen />
          </motion.div>
        </AnimatePresence>
      </div>
      <TabBar tab={tab} onChange={go} badges={badges} />
      <EntrySheet
        entry={openedEntry ? (byId.get(openedEntry) ?? null) : null}
        onClose={() => {
          setOpenedEntry(null);
        }}
      />
      <SettingsSheet
        open={settings}
        onClose={() => {
          setSettings(false);
        }}
      />
    </ShellContext.Provider>
  );
}
