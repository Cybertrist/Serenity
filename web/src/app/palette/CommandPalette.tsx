import {
  ArrowSquareInIcon,
  ArrowsLeftRightIcon,
  BellIcon,
  BookOpenIcon,
  LockSimpleIcon,
  MagicWandIcon,
  MagnifyingGlassIcon,
  MoonIcon,
  PlusIcon,
  ScrollIcon,
  ShieldCheckIcon,
  SlidersHorizontalIcon,
  SparkleIcon,
  SunIcon,
  TargetIcon,
  type Icon,
} from "@phosphor-icons/react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import {
  isValidElement,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  type KeyboardEvent,
  type ReactNode,
} from "react";
import { createPortal } from "react-dom";
import { Kbd, Monogram, setThemeChoice, useTheme } from "../../design";
import { plural } from "../../lib/format";
import { copySecret } from "../clipboard";
import { desktop } from "../desktop";
import { useHealth } from "../health";
import { useEntries, type VaultEntry } from "../hooks/useEntries";
import { useSession } from "../session";
import { useShell } from "../shell/context";
import { TABS } from "../shell/nav";
import { useAgentState } from "../shell/useShellData";
import { useToast } from "../toast";
import { match } from "./match";

interface Command {
  id: string;
  group: string;
  label: string;
  hint?: string;
  icon: Icon | ReactNode;
  keys?: string;
  /** Extra words the search looks at ("mot de passe" for the generator). */
  words?: string;
  entry?: VaultEntry;
  run: () => void;
}

const MAX_ENTRIES = 7;

function Highlight({ text, query }: { text: string; query: string }) {
  const range = match(text, query).range;
  if (!range) return <>{text}</>;
  return (
    <>
      {text.slice(0, range[0])}
      <mark className="bg-transparent font-semibold text-accent-text">
        {text.slice(range[0], range[1])}
      </mark>
      {text.slice(range[1])}
    </>
  );
}

/**
 * Ctrl+K: every entry, every screen and every action, by keyboard. Arrows to choose, Enter to
 * run, Ctrl+Enter to copy the password of an entry, Escape to close.
 */
export function CommandPalette({
  open,
  initialQuery = "",
  onClose,
}: {
  open: boolean;
  initialQuery?: string;
  onClose: () => void;
}) {
  const shell = useShell();
  const session = useSession();
  const { entries } = useEntries();
  const health = useHealth();
  const agent = useAgentState();
  const theme = useTheme();
  const toast = useToast();
  const reduce = useReducedMotion();
  const id = useId();
  const input = useRef<HTMLInputElement>(null);
  const list = useRef<HTMLDivElement>(null);
  const [query, setQuery] = useState(initialQuery);
  const [active, setActive] = useState(0);
  const [slot, setSlot] = useState<HTMLElement | null>(null);

  useEffect(() => {
    if (!open) return;
    setQuery(initialQuery);
    setActive(0);
    setSlot(document.getElementById("dialog-slot"));
    const previous = document.activeElement as HTMLElement | null;
    const t = setTimeout(() => input.current?.focus(), 10);
    return () => {
      clearTimeout(t);
      previous?.focus();
    };
  }, [open, initialQuery]);

  const copyPassword = (e: VaultEntry) => {
    if (!e.entry.password) {
      toast("Cette entrée n'a pas de mot de passe.", "neutral");
      return;
    }
    void copySecret(e.entry.password).then(
      () => {
        toast(`Mot de passe de ${e.entry.name} copié. Effacé dans 30 s.`);
      },
      () => {
        toast("Copie impossible : le navigateur l'a refusée.", "warn");
      },
    );
  };

  const commands = useMemo<Command[]>(() => {
    const all: Command[] = [];
    const opened = shell.openedEntry ? entries.find((e) => e.item.id === shell.openedEntry) : null;
    if (opened?.entry.password)
      all.push({
        id: "copy-opened",
        group: "Suggestions",
        label: `Copier le mot de passe de ${opened.entry.name}`,
        icon: ArrowSquareInIcon,
        run: () => {
          copyPassword(opened);
        },
      });
    if (agent.waiting > 0)
      all.push({
        id: "review",
        group: "Suggestions",
        label: `Examiner ${plural(agent.waiting, "rotation", "rotations")} en attente`,
        hint: "L'agent attend ton accord",
        icon: SparkleIcon,
        run: () => {
          shell.go("agent");
        },
      });
    if (health.flagged > 0)
      all.push({
        id: "leaks",
        group: "Suggestions",
        label: `Voir ${plural(health.flagged, "compte", "comptes")} à surveiller`,
        icon: TargetIcon,
        run: () => {
          shell.go("breaches");
        },
      });
    if (!session.offline)
      all.push({
        id: "new",
        group: "Actions",
        label: "Nouvelle entrée",
        words: "ajouter créer compte",
        icon: PlusIcon,
        keys: "mod+n",
        run: shell.addEntry,
      });
    all.push(
      {
        id: "generate",
        group: "Actions",
        label: "Générer un mot de passe",
        words: "générateur phrase de passe aléatoire",
        icon: MagicWandIcon,
        run: shell.openGenerator,
      },
      {
        id: "lock",
        group: "Actions",
        label: "Verrouiller le coffre",
        icon: LockSimpleIcon,
        keys: "mod+l",
        run: shell.lock,
      },
      {
        id: "theme",
        group: "Actions",
        label: theme === "dark" ? "Passer en thème clair" : "Passer en thème sombre",
        words: "apparence couleur jour nuit",
        icon: theme === "dark" ? SunIcon : MoonIcon,
        run: () => {
          setThemeChoice(theme === "dark" ? "light" : "dark");
        },
      },
      {
        id: "settings",
        group: "Actions",
        label: "Réglages",
        words: "préférences options",
        icon: SlidersHorizontalIcon,
        keys: "mod+,",
        run: () => {
          shell.openSettings();
        },
      },
      {
        id: "notifications",
        group: "Actions",
        label: "Notifications",
        icon: BellIcon,
        run: shell.openNotifications,
      },
      {
        id: "journal",
        group: "Actions",
        label: "Journal d'activité",
        words: "historique audit logs",
        icon: ScrollIcon,
        run: () => {
          shell.openSettings("journal");
        },
      },
      {
        id: "import",
        group: "Actions",
        label: "Importer ou exporter",
        words: "bitwarden google authenticator csv",
        icon: ArrowSquareInIcon,
        run: () => {
          shell.openSettings("transfer");
        },
      },
      {
        id: "guide",
        group: "Actions",
        label: "Guide",
        words: "aide comment",
        icon: BookOpenIcon,
        run: shell.openGuide,
      },
    );
    const bridge = desktop();
    if (bridge)
      all.push({
        id: "server",
        group: "Actions",
        label: "Changer de serveur",
        words: "adresse url connexion",
        icon: ArrowsLeftRightIcon,
        run: bridge.changeServer,
      });
    for (const tab of TABS)
      all.push({
        id: `go-${tab.id}`,
        group: "Aller à",
        label: tab.long,
        hint: tab.hint,
        icon: tab.icon,
        keys: tab.keys,
        run: () => {
          shell.go(tab.id);
        },
      });
    all.push(
      {
        id: "zone-personal",
        group: "Aller à",
        label: "Protégé par toi",
        hint: "Ta zone, que toi seul peux lire",
        icon: ShieldCheckIcon,
        run: () => {
          shell.setVaultZone("personal");
          shell.go("vault");
        },
      },
      {
        id: "zone-agent",
        group: "Aller à",
        label: "Confié à l'agent",
        hint: "Les comptes que l'agent surveille et change",
        icon: SparkleIcon,
        run: () => {
          shell.setVaultZone("agent");
          shell.go("vault");
        },
      },
    );
    return all;
  }, [shell, entries, agent.waiting, health.flagged, session.offline, theme]);

  const shown = useMemo<Command[]>(() => {
    const q = query.trim();
    if (!q) return commands;
    const found = entries
      .map((e) => {
        const best = Math.max(
          match(e.entry.name, q).score * 2,
          match(e.entry.username ?? "", q).score,
          match(e.domain ?? "", q).score,
        );
        return { e, best };
      })
      .filter((x) => x.best > 0)
      .sort((a, b) => b.best - a.best)
      .slice(0, MAX_ENTRIES)
      .map<Command>(({ e }) => ({
        id: `entry-${e.item.id}`,
        group: "Entrées",
        label: e.entry.name,
        hint: e.entry.username ?? e.domain ?? "",
        icon: <Monogram name={e.entry.name} size={26} />,
        entry: e,
        run: () => {
          shell.go("vault");
          shell.openEntry(e.item.id);
        },
      }));
    const rest = commands
      .filter((c) => c.group !== "Suggestions")
      .map((c) => ({
        c,
        s: Math.max(match(c.label, q).score * 2, match(c.words ?? "", q).score),
      }))
      .filter((x) => x.s > 0)
      .sort((a, b) => b.s - a.s)
      .map((x) => x.c);
    return [
      ...found,
      ...rest.filter((c) => c.group === "Actions"),
      ...rest.filter((c) => c.group === "Aller à"),
    ];
  }, [query, commands, entries, shell]);

  useEffect(() => {
    setActive((a) => Math.min(a, Math.max(0, shown.length - 1)));
  }, [shown.length]);

  useEffect(() => {
    list.current
      ?.querySelector<HTMLElement>(`[data-index="${String(active)}"]`)
      ?.scrollIntoView({ block: "nearest" });
  }, [active]);

  const run = (command: Command | undefined) => {
    if (!command) return;
    onClose();
    // After the palette has let go of the focus, so a dialog it opens can take it.
    setTimeout(command.run, 0);
  };

  const onKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    event.stopPropagation();
    const count = shown.length;
    const key = event.key;
    if (key === "Escape" || ((event.ctrlKey || event.metaKey) && key.toLowerCase() === "k")) {
      event.preventDefault();
      onClose();
    } else if (key === "ArrowDown" || (event.ctrlKey && key === "n")) {
      event.preventDefault();
      if (count) setActive((a) => (a + 1) % count);
    } else if (key === "ArrowUp" || (event.ctrlKey && key === "p")) {
      event.preventDefault();
      if (count) setActive((a) => (a - 1 + count) % count);
    } else if (key === "Home" && event.ctrlKey) {
      event.preventDefault();
      setActive(0);
    } else if (key === "End" && event.ctrlKey) {
      event.preventDefault();
      setActive(Math.max(0, count - 1));
    } else if (key === "PageDown") {
      event.preventDefault();
      setActive((a) => Math.min(count - 1, a + 5));
    } else if (key === "PageUp") {
      event.preventDefault();
      setActive((a) => Math.max(0, a - 5));
    } else if (key === "Enter") {
      event.preventDefault();
      const command = shown[active];
      if ((event.ctrlKey || event.metaKey) && command?.entry) {
        const entry = command.entry;
        onClose();
        copyPassword(entry);
        return;
      }
      run(command);
    } else if (key === "Tab") {
      event.preventDefault();
    }
  };

  const current = shown[active];
  let lastGroup = "";

  const panel = (
    <AnimatePresence>
      {open ? (
        <div
          className={`${slot ? "absolute" : "fixed"} inset-0 z-50 flex items-start justify-center px-3 pt-[9vh] @[620px]:pt-[11vh]`}
        >
          <motion.div
            className="absolute inset-0 bg-scrim backdrop-blur-[3px]"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.16 }}
            onClick={onClose}
          />
          <motion.div
            role="dialog"
            aria-modal="true"
            aria-label="Palette de commandes"
            className="glass-float relative flex max-h-[min(560px,78vh)] w-full max-w-[620px] flex-col overflow-hidden rounded-[16px]"
            initial={reduce ? { opacity: 0 } : { opacity: 0, y: -8, scale: 0.98 }}
            animate={reduce ? { opacity: 1 } : { opacity: 1, y: 0, scale: 1 }}
            exit={reduce ? { opacity: 0 } : { opacity: 0, y: -4, scale: 0.99 }}
            transition={{ duration: 0.2, ease: [0.2, 0.8, 0.2, 1] }}
          >
            <div className="flex h-14 shrink-0 items-center gap-3 border-b border-line px-4">
              <MagnifyingGlassIcon size={18} aria-hidden="true" className="shrink-0 text-faint" />
              <input
                ref={input}
                role="combobox"
                aria-expanded="true"
                aria-controls={`${id}-list`}
                aria-activedescendant={current ? `${id}-${current.id}` : undefined}
                aria-autocomplete="list"
                aria-label="Chercher une entrée ou une action"
                placeholder="Cherche une entrée ou tape une action"
                value={query}
                spellCheck={false}
                autoComplete="off"
                onChange={(e) => {
                  setQuery(e.target.value);
                  setActive(0);
                }}
                onKeyDown={onKeyDown}
                className="h-full min-w-0 flex-1 bg-transparent text-[16px] outline-none placeholder:text-faint"
              />
              <Kbd keys="escape" />
            </div>
            <div
              ref={list}
              id={`${id}-list`}
              role="listbox"
              aria-label="Résultats"
              className="min-h-0 flex-1 overflow-y-auto p-1.5"
            >
              {shown.length === 0 ? (
                <p className="m-0 px-4 py-7 text-center text-[13.5px] text-faint">
                  Rien ne correspond à « {query.trim()} ».
                </p>
              ) : (
                shown.map((c, index) => {
                  const head = c.group !== lastGroup ? c.group : null;
                  lastGroup = c.group;
                  const selected = index === active;
                  const IconComponent = isValidElement(c.icon) ? null : (c.icon as Icon);
                  return (
                    <div key={c.id}>
                      {head ? (
                        <div className="eyebrow px-2.5 pb-1.5 pt-2.5" aria-hidden="true">
                          {head}
                        </div>
                      ) : null}
                      <div
                        id={`${id}-${c.id}`}
                        role="option"
                        aria-selected={selected}
                        data-index={index}
                        onMouseMove={() => {
                          if (active !== index) setActive(index);
                        }}
                        onMouseDown={(e) => {
                          e.preventDefault();
                        }}
                        onClick={() => {
                          run(c);
                        }}
                        className={`flex h-[42px] cursor-pointer items-center gap-3 rounded-[9px] px-2.5 text-[14px] ${
                          selected
                            ? "bg-glass-hi shadow-[inset_0_0_0_1px_var(--color-line-strong)]"
                            : ""
                        }`}
                      >
                        {IconComponent ? (
                          <span
                            className={`grid h-[26px] w-[26px] shrink-0 place-items-center rounded-[7px] ${selected ? "bg-accent-soft text-accent-text" : "bg-hover text-muted"}`}
                          >
                            <IconComponent size={15} aria-hidden="true" />
                          </span>
                        ) : (
                          (c.icon as ReactNode)
                        )}
                        <span className="min-w-0 truncate">
                          <Highlight text={c.label} query={query} />
                        </span>
                        {c.hint ? (
                          <span className="hidden min-w-0 truncate text-[12.5px] text-faint @[620px]:inline">
                            {c.hint}
                          </span>
                        ) : null}
                        <span className="ml-auto flex shrink-0 items-center gap-1">
                          {c.keys ? <Kbd keys={c.keys} /> : null}
                          {c.entry && selected ? <Kbd keys="enter" /> : null}
                        </span>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
            <div className="hidden shrink-0 items-center gap-4 border-t border-line px-4 py-2.5 text-[12px] text-faint [@media(pointer:fine)]:flex">
              <span className="inline-flex items-center gap-1.5">
                <Kbd keys="arrowup" />
                <Kbd keys="arrowdown" />
                choisir
              </span>
              <span className="inline-flex items-center gap-1.5">
                <Kbd keys="enter" />
                {current?.entry ? "ouvrir" : "lancer"}
              </span>
              {current?.entry ? (
                <span className="inline-flex items-center gap-1.5">
                  <Kbd keys="mod+enter" />
                  copier le mot de passe
                </span>
              ) : null}
              <span className="ml-auto inline-flex items-center gap-1.5">
                <Kbd keys="mod+k" />
                fermer
              </span>
            </div>
          </motion.div>
        </div>
      ) : null}
    </AnimatePresence>
  );

  return slot ? createPortal(panel, slot) : panel;
}
