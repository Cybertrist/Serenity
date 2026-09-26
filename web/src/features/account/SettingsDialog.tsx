import {
  ArrowsLeftRightIcon,
  CloudSlashIcon,
  DevicesIcon,
  type Icon,
  InfoIcon,
  LockKeyIcon,
  PaintBrushIcon,
  TerminalWindowIcon,
  TrashIcon,
  UserCircleIcon,
  WatchIcon,
} from "@phosphor-icons/react";
import { useCallback, useEffect, useState } from "react";
import { useSession } from "../../app/session";
import { useToast } from "../../app/toast";
import { Modal, Note } from "../../design";
import { JournalSection } from "../logs/JournalSection";
import { AboutSection } from "./settings/AboutSection";
import { AccountSection } from "./settings/AccountSection";
import { AppearanceSection } from "./settings/AppearanceSection";
import { DevicesSection } from "./settings/DevicesSection";
import { LockSection } from "./settings/LockSection";
import { TransferSection } from "./settings/TransferSection";
import { TrashSection } from "./settings/TrashSection";
import { WatchSection } from "./settings/WatchSection";
import { SettingsGuard } from "./settings/guard";

import type { SettingsSection } from "../../app/shell/context";

/** `online` marks a section that cannot work without the server. */
const SECTIONS: { id: SettingsSection; label: string; icon: Icon; online: boolean }[] = [
  { id: "lock", label: "Verrouillage", icon: LockKeyIcon, online: false },
  { id: "appearance", label: "Apparence", icon: PaintBrushIcon, online: false },
  { id: "journal", label: "Journal", icon: TerminalWindowIcon, online: true },
  { id: "devices", label: "Appareils", icon: DevicesIcon, online: true },
  { id: "watch", label: "Surveillance", icon: WatchIcon, online: true },
  { id: "transfer", label: "Import et export", icon: ArrowsLeftRightIcon, online: true },
  { id: "trash", label: "Corbeille", icon: TrashIcon, online: true },
  { id: "account", label: "Compte", icon: UserCircleIcon, online: true },
  { id: "about", label: "À propos", icon: InfoIcon, online: false },
];

/** Settings: one section at a time, so nothing is an endless scroll. */
export function SettingsDialog({
  open,
  section = "lock",
  onClose,
}: {
  open: boolean;
  /** Where to land: other screens open the dialog straight on their section. */
  section?: SettingsSection;
  onClose: () => void;
}) {
  const session = useSession();
  const toast = useToast();
  const [current, setCurrent] = useState<SettingsSection>(section);
  const [held, setHeld] = useState(false);
  const hold = useCallback((value: boolean) => {
    setHeld(value);
  }, []);
  const close = () => {
    if (held) {
      toast("Garde d'abord ton nouveau kit, puis confirme-le.", "warn");
      return;
    }
    onClose();
  };
  useEffect(() => {
    if (open) setCurrent(section);
  }, [open, section]);
  const blocked = session.offline && SECTIONS.find((s) => s.id === current)?.online === true;

  const body = () => {
    if (blocked)
      return (
        <Note tone="warn" icon={CloudSlashIcon}>
          Hors ligne : cette section a besoin du serveur. Reconnecte-toi au serveur pour l'utiliser.
        </Note>
      );
    switch (current) {
      case "lock":
        return <LockSection onClose={close} />;
      case "appearance":
        return <AppearanceSection />;
      case "journal":
        return <JournalSection />;
      case "devices":
        return <DevicesSection />;
      case "watch":
        return <WatchSection />;
      case "transfer":
        return <TransferSection />;
      case "trash":
        return <TrashSection />;
      case "account":
        return <AccountSection onClose={close} />;
      case "about":
        return <AboutSection />;
    }
  };

  return (
    <Modal
      open={open}
      onClose={close}
      title="Réglages"
      {...(session.username ? { subtitle: session.username } : {})}
      icon={UserCircleIcon}
      size="lg"
      flush
    >
      <SettingsGuard.Provider value={hold}>
        <div className="flex min-h-0 flex-1 flex-col overflow-y-auto @[760px]:flex-row @[760px]:overflow-hidden">
          <nav
            aria-label="Sections des réglages"
            className="flex shrink-0 gap-1 overflow-x-auto border-b border-line px-4 py-2.5 @[760px]:w-[220px] @[760px]:flex-col @[760px]:overflow-visible @[760px]:border-b-0 @[760px]:border-r @[760px]:px-3 @[760px]:py-4"
          >
            {SECTIONS.map(({ id, label, icon: IconComponent }) => {
              const active = id === current;
              return (
                <button
                  key={id}
                  type="button"
                  aria-current={active ? "true" : undefined}
                  disabled={held && !active}
                  onClick={() => {
                    setCurrent(id);
                  }}
                  className={`flex h-10 shrink-0 items-center gap-2.5 whitespace-nowrap rounded-control px-3 text-caption transition-colors duration-150 disabled:opacity-40 @[760px]:w-full ${
                    active
                      ? "bg-raised font-semibold text-text shadow-card"
                      : "font-medium text-muted hover:bg-hover hover:text-text"
                  }`}
                >
                  <IconComponent
                    size={18}
                    weight={active ? "fill" : "regular"}
                    aria-hidden="true"
                    className={active ? "text-accent" : ""}
                  />
                  {label}
                </button>
              );
            })}
          </nav>
          <div className="min-w-0 flex-1 px-5 py-5 @[620px]:px-6 @[760px]:overflow-y-auto">
            {body()}
          </div>
        </div>
      </SettingsGuard.Provider>
    </Modal>
  );
}
