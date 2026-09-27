import {
  ArrowsLeftRightIcon,
  BinocularsIcon,
  CaretLeftIcon,
  CaretRightIcon,
  CloudSlashIcon,
  DevicesIcon,
  type Icon,
  InfoIcon,
  KeyIcon,
  LockKeyIcon,
  LockSimpleIcon,
  PaintBrushIcon,
  TerminalWindowIcon,
  TrashIcon,
  UserCircleIcon,
} from "@phosphor-icons/react";
import { AnimatePresence, motion } from "motion/react";
import { useCallback, useState, type ReactNode } from "react";
import { useEntries } from "../../app/hooks/useEntries";
import { lockMinutes } from "../../app/prefs";
import { useSession } from "../../app/session";
import { Header } from "../../app/shell/Header";
import { useShell, type SettingsSection } from "../../app/shell/context";
import { useShortcut } from "../../app/shortcuts";
import { EASE_OUT, Glass, IconButton, Note, SPRING, themeChoice } from "../../design";
import { JournalSection } from "../logs/JournalSection";
import { AboutSection, APP_VERSION } from "./settings/AboutSection";
import { AccountSection, Avatar } from "./settings/AccountSection";
import { AppearanceSection } from "./settings/AppearanceSection";
import { DevicesSection, useDeviceSessions } from "./settings/DevicesSection";
import { LockSection } from "./settings/LockSection";
import { RecoveryKitSection } from "./settings/RecoveryKitSection";
import { TransferSection } from "./settings/TransferSection";
import { TrashSection } from "./settings/TrashSection";
import { useWatchedEmails, WatchSection } from "./settings/WatchSection";
import { SettingsGuard } from "./settings/guard";

interface Meta {
  id: SettingsSection;
  label: string;
  /** A shorter name for the big title of a phone, where the long one would be cut. */
  short?: string;
  /** What the section is for, under its title. */
  hint: string;
  icon: Icon;
  /** The section cannot work without the server. */
  online: boolean;
}

/** The sections, in three groups: this device, the vault, the account. */
const GROUPS: { name: string; sections: Meta[] }[] = [
  {
    name: "Cet appareil",
    sections: [
      {
        id: "lock",
        label: "Verrouillage",
        hint: "Quand le coffre se referme de lui-même.",
        icon: LockKeyIcon,
        online: false,
      },
      {
        id: "appearance",
        label: "Apparence",
        hint: "Sombre, clair, ou comme ton appareil.",
        icon: PaintBrushIcon,
        online: false,
      },
    ],
  },
  {
    name: "Coffre",
    sections: [
      {
        id: "watch",
        label: "Veille",
        hint: "Les adresses que l'agent guette dans les fuites.",
        icon: BinocularsIcon,
        online: true,
      },
      {
        id: "transfer",
        label: "Import et export",
        hint: "Faire entrer tes mots de passe, en garder une copie chiffrée.",
        icon: ArrowsLeftRightIcon,
        online: true,
      },
      {
        id: "trash",
        label: "Corbeille",
        hint: "Ce que tu as supprimé, pendant 30 jours.",
        icon: TrashIcon,
        online: true,
      },
      {
        id: "journal",
        label: "Journal",
        hint: "Chaque geste de l'agent et chaque connexion, ligne par ligne.",
        icon: TerminalWindowIcon,
        online: true,
      },
    ],
  },
  {
    name: "Compte",
    sections: [
      {
        id: "recovery",
        label: "Kit de récupération",
        short: "Récupération",
        hint: "Ta voie de secours si tu oublies ton mot de passe maître.",
        icon: KeyIcon,
        online: true,
      },
      {
        id: "devices",
        label: "Appareils",
        hint: "Où ton compte est ouvert, et comment le fermer à distance.",
        icon: DevicesIcon,
        online: true,
      },
      {
        id: "account",
        label: "Compte",
        hint: "Ton mot de passe maître, et quitter cet appareil.",
        icon: UserCircleIcon,
        online: true,
      },
      {
        id: "about",
        label: "À propos",
        hint: "La version, le serveur, le code source.",
        icon: InfoIcon,
        online: false,
      },
    ],
  },
];

const SECTIONS: Meta[] = GROUPS.flatMap((g) => g.sections);
const FIRST: SettingsSection = "lock";

function Body({ id }: { id: SettingsSection }) {
  switch (id) {
    case "lock":
      return <LockSection />;
    case "appearance":
      return <AppearanceSection />;
    case "watch":
      return <WatchSection />;
    case "transfer":
      return <TransferSection />;
    case "trash":
      return <TrashSection />;
    case "journal":
      return <JournalSection />;
    case "recovery":
      return <RecoveryKitSection />;
    case "devices":
      return <DevicesSection />;
    case "account":
      return <AccountSection />;
    case "about":
      return <AboutSection />;
  }
}

/** A section, or why it cannot open right now. */
function Section({ meta }: { meta: Meta }) {
  const session = useSession();
  if (session.offline && meta.online)
    return (
      <Note tone="warn" icon={CloudSlashIcon}>
        Hors ligne : cette section a besoin du serveur. Reconnecte-toi au serveur pour l'utiliser.
      </Note>
    );
  return <Body id={meta.id} />;
}

/**
 * The settings, a screen of their own. Wide: the sections on the left, the chosen one on the
 * right. On a phone: the list of sections, each one opening full screen with a way back.
 */
export function SettingsScreen() {
  const shell = useShell();
  const [held, setHeld] = useState(false);
  const hold = useCallback((value: boolean) => {
    setHeld(value);
  }, []);
  const phone = shell.form === "mobile";
  const current = SECTIONS.find((s) => s.id === shell.settingsSection) ?? null;

  return (
    <SettingsGuard.Provider value={hold}>
      {phone ? <PhoneSettings current={current} /> : <WideSettings current={current} held={held} />}
    </SettingsGuard.Provider>
  );
}

function WideSettings({ current, held }: { current: Meta | null; held: boolean }) {
  const shell = useShell();
  const shown = current ?? SECTIONS.find((s) => s.id === FIRST);
  if (!shown) return null;
  return (
    <>
      <Header
        title="Réglages"
        subtitle="Ce coffre, ses appareils et la façon dont il se protège."
      />
      <div className="grid grid-cols-[210px_minmax(0,1fr)] items-start gap-8 @[1180px]:grid-cols-[228px_minmax(0,780px)] @[1180px]:gap-10">
        <nav aria-label="Sections des réglages" className="sticky top-0 flex flex-col gap-4">
          {GROUPS.map((group) => (
            <div key={group.name} className="flex flex-col gap-1">
              <span className="eyebrow px-2.5">{group.name}</span>
              <div className="flex flex-col gap-px">
                {group.sections.map(({ id, label, icon: IconComponent }) => {
                  const active = id === shown.id;
                  return (
                    <button
                      key={id}
                      type="button"
                      aria-current={active ? "page" : undefined}
                      disabled={held && !active}
                      onClick={() => {
                        shell.openSettings(id);
                      }}
                      className={`relative flex h-[34px] w-full items-center gap-2.5 rounded-[8px] px-2.5 text-left text-[13.5px] font-medium transition-colors duration-150 disabled:opacity-40 ${
                        active ? "text-text" : "text-muted hover:bg-hover hover:text-text"
                      }`}
                    >
                      {active ? (
                        <motion.span
                          layoutId="settings-current"
                          transition={SPRING}
                          aria-hidden="true"
                          className="absolute inset-0 rounded-[8px] bg-glass-hi shadow-[inset_0_0_0_1px_var(--color-line)]"
                        />
                      ) : null}
                      <IconComponent
                        size={17}
                        weight={active ? "fill" : "regular"}
                        aria-hidden="true"
                        className={`relative shrink-0 ${active ? "text-accent-text" : ""}`}
                      />
                      <span className="relative truncate">{label}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </nav>
        <AnimatePresence mode="wait" initial={false}>
          <motion.div
            key={shown.id}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            transition={{ duration: 0.2, ease: EASE_OUT }}
            className="flex min-w-0 flex-col gap-4"
          >
            <SectionHead meta={shown} />
            <Section meta={shown} />
          </motion.div>
        </AnimatePresence>
      </div>
    </>
  );
}

/** The name of the open section and what it is for, over its groups on a wide screen. */
function SectionHead({ meta }: { meta: Meta }) {
  const IconComponent = meta.icon;
  return (
    <div className="flex items-center gap-3 px-1 pb-1">
      <span className="grid h-9 w-9 shrink-0 place-items-center rounded-[10px] bg-accent-soft text-accent-text">
        <IconComponent size={19} weight="duotone" aria-hidden="true" />
      </span>
      <div className="flex min-w-0 flex-col">
        <h2 className="m-0 text-[17px] font-semibold leading-tight tracking-[-0.01em]">
          {meta.label}
        </h2>
        <p className="m-0 text-caption text-muted">{meta.hint}</p>
      </div>
    </div>
  );
}

function PhoneSettings({ current }: { current: Meta | null }) {
  const shell = useShell();
  const back = useCallback(() => {
    shell.openSettings();
  }, [shell]);
  useShortcut("escape", back, { enabled: current !== null });

  return (
    <AnimatePresence mode="wait" initial={false}>
      {current ? (
        <motion.div
          key={current.id}
          initial={{ opacity: 0, x: 24 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: 24 }}
          transition={{ duration: 0.22, ease: EASE_OUT }}
          className="flex flex-col"
        >
          <button
            type="button"
            onClick={back}
            className="-ml-2 mb-1 inline-flex min-h-11 items-center gap-1 self-start rounded-control px-2 text-[14px] font-medium text-accent-text active:bg-hover"
          >
            <CaretLeftIcon size={18} weight="bold" aria-hidden="true" />
            Réglages
          </button>
          <Header title={current.short ?? current.label} subtitle={current.hint} />
          <div className="flex flex-col gap-4">
            <Section meta={current} />
          </div>
        </motion.div>
      ) : (
        <motion.div
          key="list"
          initial={{ opacity: 0, x: -24 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -24 }}
          transition={{ duration: 0.22, ease: EASE_OUT }}
          className="flex flex-col"
        >
          <SettingsList />
        </motion.div>
      )}
    </AnimatePresence>
  );
}

/** The phone's list: who is here, then the sections in their groups, each with its state. */
function SettingsList() {
  const shell = useShell();
  const session = useSession();
  const { trash } = useEntries();
  const devices = useDeviceSessions();
  const emails = useWatchedEmails();
  const name = session.username ?? "";
  const host = typeof location !== "undefined" ? location.host : "";

  const value = (id: SettingsSection): ReactNode => {
    switch (id) {
      case "lock":
        return `${String(lockMinutes())} min`;
      case "appearance": {
        const choice = themeChoice();
        return choice === "dark" ? "Sombre" : choice === "light" ? "Clair" : "Système";
      }
      case "watch":
        return emails.data?.emails.length ? String(emails.data.emails.length) : null;
      case "transfer":
        return "Google, Bitwarden";
      case "trash":
        return trash.length ? String(trash.length) : null;
      case "devices":
        return devices.data ? String(devices.data.length) : null;
      case "about":
        return APP_VERSION;
      default:
        return null;
    }
  };

  return (
    <>
      <Header
        title="Réglages"
        subtitle="Ce coffre, ses appareils et la façon dont il se protège."
      />
      <div className="flex flex-col gap-5">
        <Glass className="flex items-center gap-3.5 px-4 py-3.5">
          <Avatar name={name} size={44} />
          <button
            type="button"
            onClick={() => {
              shell.openSettings("account");
            }}
            className="flex min-w-0 flex-1 flex-col gap-0.5 text-left"
          >
            <span className="truncate text-[15.5px] font-semibold leading-tight">{name}</span>
            <span className="truncate text-caption text-muted">
              {session.offline ? `${host}, hors ligne` : host}
            </span>
          </button>
          <IconButton icon={LockSimpleIcon} label="Verrouiller" onClick={shell.lock} />
        </Glass>
        {GROUPS.map((group) => (
          <section key={group.name} className="flex flex-col gap-2">
            <h2 className="eyebrow m-0 px-1.5">{group.name}</h2>
            <Glass className="flex flex-col overflow-hidden">
              {group.sections.map((meta, i) => (
                <ListRow
                  key={meta.id}
                  meta={meta}
                  first={i === 0}
                  value={value(meta.id)}
                  onOpen={() => {
                    shell.openSettings(meta.id);
                  }}
                />
              ))}
            </Glass>
          </section>
        ))}
      </div>
    </>
  );
}

function ListRow({
  meta,
  value,
  first,
  onOpen,
}: {
  meta: Meta;
  value: ReactNode;
  first: boolean;
  onOpen: () => void;
}) {
  const IconComponent = meta.icon;
  return (
    <motion.button
      type="button"
      onClick={onOpen}
      whileTap={{ scale: 0.99 }}
      transition={SPRING}
      className="flex w-full items-center gap-3.5 pl-4 text-left transition-colors duration-150 active:bg-press"
    >
      <IconComponent size={20} aria-hidden="true" className="shrink-0 text-muted" />
      <span
        className={`flex min-h-[52px] min-w-0 flex-1 items-center gap-2 self-stretch pr-3.5 ${first ? "" : "border-t border-line"}`}
      >
        <span className="min-w-0 flex-1 truncate text-[14.5px] font-medium">{meta.label}</span>
        {value ? (
          <span className="tabular shrink-0 truncate text-[13px] text-faint">{value}</span>
        ) : null}
        <CaretRightIcon size={16} aria-hidden="true" className="shrink-0 text-faint" />
      </span>
    </motion.button>
  );
}
