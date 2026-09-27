import {
  CaretRightIcon,
  CloudSlashIcon,
  DownloadSimpleIcon,
  LockKeyIcon,
  MagnifyingGlassIcon,
  ClockCountdownIcon,
  PlusIcon,
  QuestionIcon,
  ShieldCheckIcon,
  SparkleIcon,
  StarIcon,
  VaultIcon,
  WarningIcon,
} from "@phosphor-icons/react";
import { motion } from "motion/react";
import { useEffect, useLayoutEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { copySecret } from "../../app/clipboard";
import { useHealth } from "../../app/health";
import { useBreaches } from "../../app/hooks/queries";
import { useEntries, type VaultEntry } from "../../app/hooks/useEntries";
import { useSession } from "../../app/session";
import { useShell, type VaultZone } from "../../app/shell/context";
import { Header } from "../../app/shell/Header";
import { useLastScan } from "../../app/shell/useShellData";
import { useShortcut } from "../../app/shortcuts";
import { useToast } from "../../app/toast";
import {
  Button,
  EmptyState,
  HealthRing,
  IconButton,
  Kbd,
  LIST,
  LIST_ITEM,
  Monogram,
  Note,
  SearchField,
  Segmented,
} from "../../design";
import { plural, relative } from "../../lib/format";
import type { Zone } from "../../vault/state";
import { errorText } from "../account/screens/wording";
import { EntryPane } from "./EntryDialog";
import { useSignals, type Signals } from "./signals";
import { zoneChip } from "./zone";

/* ============ Where things stand ============ */

interface Status {
  tone: "ok" | "warn" | "neutral";
  sentence: string;
  /** The next thing to do, when there is one, and where it leads. */
  next: { text: string; run: () => void } | null;
}

/**
 * The vault opens on one sentence: all is well, or what asks for attention, then what to do.
 * Offline, or while the alerts have not answered, nothing reassuring is said: "all is well" is
 * a claim, and the app only makes it when it knows.
 */
function useStatus(
  entries: VaultEntry[],
  of: (id: string) => Signals,
  select: (id: string) => void,
): Status {
  const session = useSession();
  const shell = useShell();
  const health = useHealth();
  const breaches = useBreaches();
  const lastScan = useLastScan();

  if (session.offline)
    return {
      tone: "neutral",
      sentence: "Hors ligne.",
      next: { text: "Ton coffre reste lisible, rien n'y est modifiable.", run: () => undefined },
    };
  if (breaches.isError)
    return {
      tone: "neutral",
      sentence: "La veille n'a pas répondu.",
      next: null,
    };
  if (health.score === null) return { tone: "neutral", sentence: "La veille répond…", next: null };

  // One thing per entry, however many signs it carries (a leak and its waiting rotation are
  // one thing to look at), plus each breached address.
  const count =
    entries.filter((e) => {
      const s = of(e.item.id);
      return s.alerts.size > 0 || s.rotation?.status === "scheduled";
    }).length + health.emails;
  if (count === 0)
    return {
      tone: "ok",
      sentence: "Tout va bien.",
      next: lastScan
        ? { text: `Veille à jour ${relative(lastScan)}.`, run: () => undefined }
        : { text: "Rien à signaler.", run: () => undefined },
    };

  const sentence =
    count === 1
      ? "Une chose demande ton attention."
      : `${String(count)} choses demandent ton attention.`;
  const leaked = entries.filter((e) => of(e.item.id).alerts.has("pwned_password"));
  const waiting = entries.filter((e) => of(e.item.id).rotation?.status === "scheduled");
  let next: Status["next"];
  const first = leaked[0];
  const waitingFirst = waiting[0];
  if (first && leaked.length === 1 && of(first.item.id).rotation?.status === "scheduled")
    next = {
      text: `${first.entry.name} est apparu dans une fuite : l'agent attend ton accord pour le changer.`,
      run: () => {
        shell.go("agent");
      },
    };
  else if (first && leaked.length === 1)
    next = {
      text:
        first.item.zone === "agent"
          ? `${first.entry.name} est apparu dans une fuite, l'agent s'en occupe.`
          : `${first.entry.name} est apparu dans une fuite : change son mot de passe.`,
      run: () => {
        select(first.item.id);
      },
    };
  else if (leaked.length > 1)
    next = {
      text: `${plural(leaked.length, "mot de passe", "mots de passe")} dans des fuites : regarde lesquels.`,
      run: () => {
        shell.go("breaches");
      },
    };
  else if (waitingFirst)
    next = {
      text:
        waiting.length === 1
          ? `L'agent attend ton accord pour ${waitingFirst.entry.name}.`
          : `L'agent attend ton accord pour ${plural(waiting.length, "rotation", "rotations")}.`,
      run: () => {
        shell.go("agent");
      },
    };
  else if (health.emails > 0)
    next = {
      text:
        health.emails === 1
          ? "Une de tes adresses est apparue dans une fuite."
          : `${String(health.emails)} de tes adresses sont apparues dans des fuites.`,
      run: () => {
        shell.go("breaches");
      },
    };
  else
    next = {
      text: `${plural(health.flagged, "mot de passe", "mots de passe")} à renforcer.`,
      run: () => {
        shell.go("breaches");
      },
    };
  return { tone: "warn", sentence, next };
}

const DOT: Record<Status["tone"], string> = {
  ok: "bg-ok shadow-[0_0_0_3px_var(--color-ok-soft)]",
  warn: "bg-warn shadow-[0_0_0_3px_var(--color-warn-soft)]",
  neutral: "bg-faint",
};

/** On a wide app: the sentence under the title, the next step as a link. */
function StatusLine({ status }: { status: Status }) {
  const actionable = status.tone === "warn" && status.next;
  return (
    <span className="flex flex-wrap items-center gap-x-1.5 gap-y-0.5">
      <span
        aria-hidden="true"
        className={`mr-1 inline-block h-2 w-2 rounded-full ${DOT[status.tone]}`}
      />
      <b className="font-medium text-text">{status.sentence}</b>
      {status.next ? (
        actionable ? (
          <button
            type="button"
            onClick={status.next.run}
            className="rounded-[6px] text-left text-warn-text underline-offset-2 hover:underline"
          >
            {status.next.text}
          </button>
        ) : (
          <span>{status.next.text}</span>
        )
      ) : null}
    </span>
  );
}

/** On a phone: the same sentence in a card, with the health ring, the whole card a button. */
function StatusCard({ status }: { status: Status }) {
  const health = useHealth();
  const actionable = status.tone === "warn" && status.next;
  const inner = (
    <>
      <HealthRing score={health.score} size={44} />
      <span className="flex min-w-0 flex-1 flex-col gap-0.5">
        <b className="text-[14.5px] font-semibold leading-snug">{status.sentence}</b>
        {status.next ? (
          <small className="text-[12.5px] leading-snug text-muted">{status.next.text}</small>
        ) : null}
      </span>
      {actionable ? (
        <CaretRightIcon size={18} aria-hidden="true" className="shrink-0 text-faint" />
      ) : null}
    </>
  );
  const look = `glass flex w-full items-center gap-3.5 rounded-[16px] px-3.5 py-3 text-left ${
    status.tone === "warn" ? "halo [--halo:var(--color-warn)]" : ""
  }`;
  return actionable && status.next ? (
    <button
      type="button"
      onClick={status.next.run}
      className={`${look} transition-colors duration-150 active:bg-press`}
    >
      {inner}
    </button>
  ) : (
    <div className={look}>{inner}</div>
  );
}

/* ============ The list ============ */

/** The small signs at the end of a row: a rotation, a leak or a lesser alert, a code, a star. */
function Flags({ entry, signals }: { entry: VaultEntry; signals: Signals }) {
  const marks: ReactNode[] = [];
  const r = signals.rotation;
  if (r && r.status !== "scheduled")
    marks.push(
      <span
        key="run"
        title="Rotation en cours"
        className="h-3 w-3 animate-spin rounded-full border-[1.5px] border-violet border-r-transparent motion-reduce:animate-none"
      />,
    );
  if (r?.status === "scheduled")
    marks.push(
      <span
        key="wait"
        title="Rotation à valider"
        className="h-[7px] w-[7px] rounded-full bg-violet shadow-[0_0_0_3px_var(--color-violet-soft)]"
      />,
    );
  if (signals.alerts.has("pwned_password"))
    marks.push(
      <WarningIcon key="leak" size={15} weight="bold" className="text-warn-text">
        <title>Vu dans une fuite</title>
      </WarningIcon>,
    );
  else if (signals.alerts.size > 0)
    marks.push(
      <span
        key="alert"
        title={
          signals.alerts.has("reused")
            ? "Réutilisé"
            : signals.alerts.has("weak")
              ? "Faible"
              : "Ancien"
        }
        className="h-[7px] w-[7px] rounded-full bg-warn"
      />,
    );
  if (entry.entry.totp)
    marks.push(
      <ClockCountdownIcon key="otp" size={15}>
        <title>Code à deux facteurs</title>
      </ClockCountdownIcon>,
    );
  if (entry.entry.favorite)
    marks.push(
      <StarIcon key="fav" size={14} weight="fill" className="text-faint">
        <title>Favori</title>
      </StarIcon>,
    );
  if (marks.length === 0) return null;
  return <span className="flex shrink-0 items-center gap-2 text-faint">{marks}</span>;
}

function EntryRow({
  entry,
  signals,
  selected,
  phone,
  onClick,
  rowRef,
}: {
  entry: VaultEntry;
  signals: Signals;
  selected: boolean;
  phone: boolean;
  onClick: () => void;
  rowRef?: (el: HTMLButtonElement | null) => void;
}) {
  return (
    <button
      ref={rowRef}
      type="button"
      onClick={onClick}
      aria-current={selected ? "true" : undefined}
      className={`flex w-full items-center gap-3 text-left transition-[background,box-shadow] duration-150 ${
        phone
          ? "min-h-[62px] px-3.5 py-2.5 active:bg-press [&:not(:first-child)]:shadow-[inset_0_1px_0_var(--color-line)]"
          : `min-h-[52px] rounded-[10px] px-2.5 py-2 ${
              selected
                ? "bg-glass-hi shadow-[inset_0_0_0_1px_var(--color-line-strong),0_8px_24px_-14px_var(--halo)]"
                : "hover:bg-hover"
            }`
      }`}
    >
      <Monogram name={entry.entry.name} size={phone ? 38 : 34} />
      <span className="flex min-w-0 flex-1 flex-col gap-0.5">
        <span
          className={`truncate font-medium leading-tight ${phone ? "text-[15px]" : "text-[13.5px]"}`}
        >
          {entry.entry.name}
        </span>
        <span
          className={`truncate leading-tight text-faint ${phone ? "text-[12.5px]" : "text-[12px]"}`}
        >
          {entry.entry.username || entry.domain || "sans identifiant"}
        </span>
      </span>
      <Flags entry={entry} signals={signals} />
      {phone ? (
        <CaretRightIcon size={16} aria-hidden="true" className="shrink-0 text-faint" />
      ) : null}
    </button>
  );
}

/** A zone heading: its glyph, its name, and who can read it. Always both: it is the model. */
function GroupHead({ zone, count, phone }: { zone: Zone; count: number; phone: boolean }) {
  const look = zoneChip(zone);
  const Glyph = look.icon;
  return (
    <div className={`flex items-center gap-2 ${phone ? "px-1 pb-2 pt-1" : "px-2.5 pb-1.5 pt-3"}`}>
      <Glyph
        size={phone ? 15 : 14}
        weight="bold"
        aria-hidden="true"
        className={zone === "agent" ? "text-violet-text" : "text-accent-text"}
      />
      <h2 className={`m-0 font-semibold leading-none ${phone ? "text-[13.5px]" : "text-[12.5px]"}`}>
        {look.label}
      </h2>
      <span className="tabular text-[11.5px] text-faint">{count}</span>
      <span className="ml-auto text-[11.5px] text-faint">{look.readers}</span>
    </div>
  );
}

function EmptyGroup({ zone }: { zone: Zone }) {
  return (
    <p className="m-0 flex items-start gap-2.5 rounded-[12px] border border-dashed border-line-strong px-3.5 py-3 text-caption text-faint">
      {zone === "agent" ? (
        <SparkleIcon size={16} aria-hidden="true" className="mt-px shrink-0" />
      ) : (
        <ShieldCheckIcon size={16} aria-hidden="true" className="mt-px shrink-0" />
      )}
      {zone === "agent"
        ? "Rien de confié. Ouvre une entrée, puis « Confier à l'agent » : c'est toujours ton choix, entrée par entrée."
        : "Rien dans cette zone. Toute nouvelle entrée arrive ici par défaut."}
    </p>
  );
}

const ZONES: { value: VaultZone; label: string }[] = [
  { value: "all", label: "Tout" },
  { value: "personal", label: "Toi" },
  { value: "agent", label: "Agent" },
];

/* ============ The screen ============ */

export function VaultScreen() {
  const session = useSession();
  const shell = useShell();
  const toast = useToast();
  const { entries, unreadable } = useEntries();
  const { of } = useSignals();
  const [query, setQuery] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const search = useRef<HTMLInputElement>(null);
  const pane = useRef<HTMLElement>(null);
  const rows = useRef(new Map<string, HTMLButtonElement>());
  const phone = shell.form === "mobile";
  const zone = shell.vaultZone;

  const matching = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return entries;
    return entries.filter((e) =>
      [e.entry.name, e.entry.username ?? "", e.domain ?? ""].some((v) =>
        v.toLowerCase().includes(q),
      ),
    );
  }, [entries, query]);
  const personal = matching.filter((e) => e.item.zone === "personal");
  const agent = matching.filter((e) => e.item.zone === "agent");
  // The order of the eye: the personal group first, then the agent's.
  const visible = useMemo(
    () => [...(zone !== "agent" ? personal : []), ...(zone !== "personal" ? agent : [])],
    [matching, zone],
  );
  const totals = useMemo(() => {
    const p = entries.filter((e) => e.item.zone === "personal").length;
    return { all: entries.length, personal: p, agent: entries.length - p };
  }, [entries]);

  // The selection follows the list: if it leaves the list (a filter, a deletion), the first
  // visible entry takes its place.
  const selected = visible.find((e) => e.item.id === selectedId) ?? visible[0] ?? null;

  const select = (id: string) => {
    if (phone) {
      shell.openEntry(id);
      return;
    }
    if (!visible.some((e) => e.item.id === id)) {
      setQuery("");
      shell.setVaultZone("all");
    }
    setSelectedId(id);
  };

  // An entry opened from elsewhere (the palette, a notification) lands in the pane on a wide
  // app, not in a dialog over it. The shell leaves the dialog closed for that case.
  useLayoutEffect(() => {
    if (phone || !shell.openedEntry) return;
    select(shell.openedEntry);
    shell.openEntry(null);
  }, [phone, shell.openedEntry]);

  useEffect(() => {
    if (!selected) return;
    rows.current.get(selected.item.id)?.scrollIntoView({ block: "nearest" });
  }, [selected]);

  const step = (delta: number) => {
    if (visible.length === 0) return;
    const at = selected ? visible.indexOf(selected) : -1;
    const next = visible[Math.max(0, Math.min(visible.length - 1, at + delta))];
    if (next) setSelectedId(next.item.id);
  };
  const open = () => {
    if (!selected) return;
    if (phone) shell.openEntry(selected.item.id);
    else pane.current?.focus();
  };

  useShortcut("/", () => {
    search.current?.focus();
  });
  // Ctrl+C copies the password of the selection, unless some text is selected: then the
  // browser copies that text, as everywhere else.
  //
  // The arrows and Enter drive the list from anywhere on the screen, except where they already
  // mean something: in a field, in a dialog, or inside the fiche (which scrolls with them).
  const copyTarget = useRef<VaultEntry | null>(null);
  copyTarget.current = phone ? null : selected;
  const keys = useRef({ step, open });
  keys.current = { step, open };
  useEffect(() => {
    if (phone) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.defaultPrevented || document.querySelector('[aria-modal="true"]')) return;
      const target = event.target;
      const plain = !event.ctrlKey && !event.metaKey && !event.altKey && !event.shiftKey;
      if (plain && ["ArrowDown", "ArrowUp", "Enter"].includes(event.key)) {
        const inside = target instanceof Node && pane.current?.contains(target);
        const field = target instanceof HTMLInputElement || target instanceof HTMLTextAreaElement;
        const control = target instanceof HTMLButtonElement || target instanceof HTMLAnchorElement;
        if (inside || field || (event.key === "Enter" && control)) return;
        event.preventDefault();
        if (event.key === "Enter") keys.current.open();
        else keys.current.step(event.key === "ArrowDown" ? 1 : -1);
        return;
      }
      if (
        !(event.ctrlKey || event.metaKey) ||
        event.key.toLowerCase() !== "c" ||
        event.shiftKey ||
        event.altKey
      )
        return;
      if (target instanceof HTMLInputElement || target instanceof HTMLTextAreaElement) {
        if (target.selectionStart !== target.selectionEnd) return;
      } else if ((window.getSelection()?.toString() ?? "") !== "") return;
      const password = copyTarget.current?.entry.password;
      if (!password) return;
      event.preventDefault();
      copySecret(password).then(
        () => {
          toast(
            `Mot de passe de ${copyTarget.current?.entry.name ?? "l'entrée"} copié. Effacé dans 30 s.`,
          );
        },
        (e: unknown) => {
          toast(errorText(e), "crit");
        },
      );
    };
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("keydown", onKey);
    };
  }, [toast, phone]);

  const status = useStatus(entries, of, select);

  const addButton = phone ? (
    session.offline ? null : (
      <IconButton
        icon={PlusIcon}
        label="Nouvelle entrée"
        onClick={shell.addEntry}
        className="!h-10 !w-10 !rounded-[12px] bg-linear-to-b from-[#4b8cf8] to-[#2c6ce4] !text-white shadow-primary hover:brightness-110"
      />
    )
  ) : (
    <>
      <Button
        variant="secondary"
        icon={DownloadSimpleIcon}
        onClick={() => {
          shell.openSettings("transfer");
        }}
      >
        Importer
      </Button>
      <Button icon={PlusIcon} kbd="mod+n" disabled={session.offline} onClick={shell.addEntry}>
        Nouvelle entrée
      </Button>
    </>
  );

  const notes = (
    <>
      {session.offline && session.needsUnlock ? (
        <div className="flex flex-col gap-3 rounded-control bg-accent-soft px-4 py-3 @[620px]:flex-row @[620px]:items-center">
          <p className="m-0 flex flex-1 items-start gap-2.5 text-caption text-accent-text">
            <LockKeyIcon size={17} weight="bold" aria-hidden="true" className="mt-px shrink-0" />
            Connexion revenue. Déverrouille à nouveau pour pouvoir modifier ton coffre.
          </p>
          <Button
            variant="secondary"
            icon={LockKeyIcon}
            onClick={() => {
              void session.lock();
            }}
          >
            Verrouiller
          </Button>
        </div>
      ) : session.offline ? (
        <Note tone="warn" icon={CloudSlashIcon}>
          Hors ligne : tu peux lire ton coffre, mais rien n'y est modifiable tant que le serveur
          n'est pas joignable.
        </Note>
      ) : null}
      {unreadable > 0 ? (
        <Note tone="crit" icon={WarningIcon}>
          {plural(unreadable, "entrée illisible", "entrées illisibles")} : elles ne se déchiffrent
          pas avec tes clés et restent masquées. Si ça dure, préviens l'administrateur du serveur.
        </Note>
      ) : null}
    </>
  );

  if (entries.length === 0)
    return (
      <>
        <Header
          title="Coffre"
          subtitle="Tes comptes, rangés dans leurs deux zones."
          actions={addButton}
        />
        <div className="flex flex-col gap-5 pb-6">
          {notes}
          <EmptyState
            icon={VaultIcon}
            title="Ton coffre est vide."
            text="Ajoute un compte, ou importe tes mots de passe depuis Google, Bitwarden ou Authenticator. Tout arrive d'abord dans ta zone personnelle."
            action={
              <div className="flex flex-col gap-2 sm:flex-row">
                <Button icon={PlusIcon} disabled={session.offline} onClick={shell.addEntry}>
                  Ajouter une entrée
                </Button>
                <Button
                  variant="secondary"
                  icon={DownloadSimpleIcon}
                  onClick={() => {
                    shell.openSettings("transfer");
                  }}
                >
                  Importer
                </Button>
                <Button variant="ghost" icon={QuestionIcon} onClick={shell.openGuide}>
                  Comment ça marche ?
                </Button>
              </div>
            }
          />
        </div>
      </>
    );

  const searchField = (
    <SearchField
      label="Filtrer le coffre"
      placeholder={
        phone ? `Chercher dans ${plural(entries.length, "entrée", "entrées")}` : "Filtrer le coffre"
      }
      value={query}
      onChange={setQuery}
      shortcut="/"
      inputRef={search}
      onKeyDown={(event) => {
        if (event.key === "ArrowDown" || event.key === "ArrowUp") {
          event.preventDefault();
          step(event.key === "ArrowDown" ? 1 : -1);
        } else if (event.key === "Enter") {
          event.preventDefault();
          open();
        }
      }}
    />
  );
  const zones = (
    <Segmented
      label="Zone"
      value={zone}
      onChange={shell.setVaultZone}
      options={ZONES.map((z) => ({
        ...z,
        count:
          z.value === "all" ? totals.all : z.value === "personal" ? totals.personal : totals.agent,
      }))}
    />
  );
  const noMatch = (
    <EmptyState
      icon={MagnifyingGlassIcon}
      title="Aucun résultat."
      text={`Rien ne correspond à « ${query} ».`}
    />
  );

  const group = (z: Zone, list: VaultEntry[]) => (
    <section aria-label={zoneChip(z).label} className={phone ? "flex flex-col" : ""}>
      <GroupHead zone={z} count={list.length} phone={phone} />
      {list.length === 0 ? (
        query ? null : (
          <div className={phone ? "" : "px-1.5 pb-1"}>
            <EmptyGroup zone={z} />
          </div>
        )
      ) : (
        <motion.div
          variants={LIST}
          initial="initial"
          animate="animate"
          className={
            phone ? "glass flex flex-col overflow-hidden rounded-[16px]" : "flex flex-col gap-px"
          }
        >
          {list.map((e) => (
            <motion.div key={e.item.id} variants={LIST_ITEM} className="contents">
              <EntryRow
                entry={e}
                signals={of(e.item.id)}
                selected={!phone && selected?.item.id === e.item.id}
                phone={phone}
                onClick={() => {
                  if (phone) shell.openEntry(e.item.id);
                  else setSelectedId(e.item.id);
                }}
                rowRef={(el) => {
                  if (el) rows.current.set(e.item.id, el);
                  else rows.current.delete(e.item.id);
                }}
              />
            </motion.div>
          ))}
        </motion.div>
      )}
    </section>
  );

  const groups =
    visible.length === 0 && query ? (
      noMatch
    ) : (
      <>
        {zone !== "agent" ? group("personal", personal) : null}
        {zone !== "personal" ? group("agent", agent) : null}
      </>
    );

  if (phone)
    return (
      <>
        <Header title="Coffre" subtitle={null} actions={addButton} />
        <div className="-mt-3 flex flex-col gap-4 pb-6">
          {notes}
          {searchField}
          {query ? null : <StatusCard status={status} />}
          {zones}
          <div className="flex flex-col gap-5">{groups}</div>
        </div>
      </>
    );

  return (
    <>
      <Header title="Coffre" subtitle={<StatusLine status={status} />} actions={addButton} />
      <div className="mb-4 flex flex-col gap-3 empty:hidden">{notes}</div>
      <div
        className={`-mb-[72px] grid min-h-[440px] grid-cols-[minmax(300px,380px)_minmax(0,1fr)] gap-5 ${
          shell.form === "desktop" ? "h-[calc(100dvh-214px)]" : "h-[calc(100dvh-206px)]"
        }`}
      >
        <section
          aria-label="Entrées"
          className="glass flex min-h-0 flex-col overflow-hidden rounded-card"
        >
          <div className="flex flex-col gap-2.5 border-b border-line p-3">
            {searchField}
            {zones}
          </div>
          <div className="min-h-0 flex-1 overflow-y-auto px-1.5 pb-2 pt-0.5">{groups}</div>
          <div className="flex items-center gap-4 border-t border-line px-3.5 py-2 text-[11.5px] text-faint">
            <span className="inline-flex items-center gap-1.5">
              <Kbd keys="arrowup" /> <Kbd keys="arrowdown" /> naviguer
            </span>
            <span className="inline-flex items-center gap-1.5">
              <Kbd keys="enter" /> ouvrir
            </span>
            <span className="inline-flex items-center gap-1.5">
              <Kbd keys="mod+c" /> copier
            </span>
          </div>
        </section>
        {selected ? (
          <EntryPane
            key={selected.item.id}
            entry={selected}
            paneRef={pane}
            onGone={() => {
              const at = visible.indexOf(selected);
              const next = visible[at + 1] ?? visible[at - 1];
              setSelectedId(next ? next.item.id : null);
            }}
          />
        ) : (
          <div className="glass grid place-items-center rounded-card p-8">
            <EmptyState
              icon={MagnifyingGlassIcon}
              title="Rien à afficher."
              text="Choisis une entrée dans la liste."
            />
          </div>
        )}
      </div>
    </>
  );
}
