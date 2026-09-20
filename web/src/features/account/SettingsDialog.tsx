import {
  ArrowsLeftRightIcon,
  CloudSlashIcon,
  DevicesIcon,
  type Icon,
  LockKeyIcon,
  TerminalWindowIcon,
  TrashIcon,
  UserCircleIcon,
  WatchIcon,
} from "@phosphor-icons/react";
import { useEffect, useState } from "react";
import { useSession } from "../../app/session";
import { Modal, Note } from "../../design";
import { JournalSection } from "../logs/JournalSection";
import { AccountSection } from "./settings/AccountSection";
import { DevicesSection } from "./settings/DevicesSection";
import { LockSection } from "./settings/LockSection";
import { TransferSection } from "./settings/TransferSection";
import { TrashSection } from "./settings/TrashSection";
import { WatchSection } from "./settings/WatchSection";

import type { SettingsSection } from "../../app/shell/context";

/** `online` marks a section that cannot work without the server. */
const SECTIONS: { id: SettingsSection; label: string; icon: Icon; online: boolean }[] = [
  { id: "lock", label: "Verrouillage", icon: LockKeyIcon, online: false },
  { id: "journal", label: "Journal", icon: TerminalWindowIcon, online: true },
  { id: "devices", label: "Appareils", icon: DevicesIcon, online: true },
  { id: "watch", label: "Surveillance", icon: WatchIcon, online: true },
  { id: "transfer", label: "Import et export", icon: ArrowsLeftRightIcon, online: true },
  { id: "trash", label: "Corbeille", icon: TrashIcon, online: true },
  { id: "account", label: "Compte", icon: UserCircleIcon, online: true },
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
  const [current, setCurrent] = useState<SettingsSection>(section);
  useEffect(() => {
    if (open) setCurrent(section);
  }, [open, section]);
  const blocked = session.offline && SECTIONS.find((s) => s.id === current)?.online === true;

  const body = () => {
    if (blocked)
      return (
        <Note tone="warn" icon={CloudSlashIcon}>
          Hors ligne : cette section a besoin du serveur. Reconnecte-toi au tailnet pour l'utiliser.
        </Note>
      );
    switch (current) {
      case "lock":
        return <LockSection onClose={onClose} />;
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
        return <AccountSection onClose={onClose} />;
    }
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Réglages"
      {...(session.username ? { subtitle: session.username } : {})}
      icon={UserCircleIcon}
      size="lg"
      flush
    >
      <div className="flex min-h-0 flex-1 flex-col overflow-y-auto md:flex-row md:overflow-hidden">
        <nav
          aria-label="Sections des réglages"
          className="flex shrink-0 gap-1.5 overflow-x-auto border-b border-line px-5 py-3 md:w-[220px] md:flex-col md:overflow-visible md:border-b-0 md:border-r md:px-3 md:py-4"
        >
          {SECTIONS.map(({ id, label, icon: IconComponent }) => {
            const active = id === current;
            return (
              <button
                key={id}
                type="button"
                aria-current={active ? "true" : undefined}
                onClick={() => {
                  setCurrent(id);
                }}
                className={`flex h-11 w-[142px] shrink-0 items-center justify-center gap-2.5 whitespace-nowrap rounded-control px-3 text-body transition-colors duration-150 md:w-full md:justify-start md:px-3.5 ${
                  active
                    ? "bg-accent-soft font-semibold text-accent"
                    : "font-medium text-muted hover:bg-hover hover:text-text"
                }`}
              >
                <IconComponent size={20} weight={active ? "fill" : "duotone"} aria-hidden="true" />
                {label}
              </button>
            );
          })}
        </nav>
        <div className="min-w-0 flex-1 px-5 py-5 md:overflow-y-auto">{body()}</div>
      </div>
    </Modal>
  );
}
