import {
  ArrowSquareOutIcon,
  ArrowsClockwiseIcon,
  ArrowUUpLeftIcon,
  CaretDownIcon,
  CopyIcon,
  EyeIcon,
  EyeSlashIcon,
  GlobeIcon,
  MagicWandIcon,
  NotePencilIcon,
  PencilSimpleIcon,
  ShieldCheckIcon,
  SparkleIcon,
  StarIcon,
  TrashIcon,
  WarningIcon,
  type Icon,
} from "@phosphor-icons/react";
import { useQueryClient } from "@tanstack/react-query";
import { useEffect, useState, type ReactNode } from "react";
import { copySecret } from "../../app/clipboard";
import type { VaultEntry } from "../../app/hooks/useEntries";
import { useSession } from "../../app/session";
import { useShell } from "../../app/shell/context";
import { useToast } from "../../app/toast";
import { Button, Confirm, IconButton, Modal, Monogram, Pill } from "../../design";
import { currentCode } from "../../lib/totp";
import { daysUntil, relative } from "../../lib/format";
import {
  delegate,
  history,
  reclaim,
  resolvePending,
  trash,
  type HistoryEntry,
} from "../../vault/operations";
import { decryptPending } from "../../vault/state";
import { errorText } from "../account/screens/wording";
import type { AlertKind } from "../breaches/scan";
import { EntryEditor } from "./EntryEditor";
import { PolicyEditor } from "./PolicyEditor";
import { MASK, PasswordText, StrengthBars, strengthOf } from "./secret";
import { useSignals, type Signals } from "./signals";
import { TotpCode } from "./TotpCode";
import { zoneChip } from "./zone";

/** The alert of an entry, in the words of the breaches screen. The worst one wins. */
const ALERT_WORDS: [AlertKind, string][] = [
  ["pwned_password", "Vu dans une fuite"],
  ["reused", "Réutilisé"],
  ["weak", "Faible"],
  ["old", "Ancien"],
];

function alertWord(signals: Signals): string | null {
  return ALERT_WORDS.find(([kind]) => signals.alerts.has(kind))?.[1] ?? null;
}

function day(iso: string | null | undefined): string {
  if (!iso) return "à régler";
  return new Date(iso).toLocaleDateString("fr-FR", { day: "numeric", month: "short" });
}

function siteHref(url: string | undefined): string | null {
  if (!url) return null;
  try {
    const parsed = new URL(url.includes("://") ? url : `https://${url}`);
    return parsed.protocol === "https:" || parsed.protocol === "http:" ? parsed.href : null;
  } catch {
    return null;
  }
}

/* ============ Actions ============ */

/**
 * Everything an entry can do, and the dialogs that ask before doing it. Shared by the fiche
 * in a pane (wide app) and the fiche in a dialog (phone, or opened from another screen).
 */
function useEntryActions(entry: VaultEntry, onGone: () => void) {
  const session = useSession();
  const toast = useToast();
  const queryClient = useQueryClient();
  const [editing, setEditing] = useState<null | "edit" | "generate">(null);
  const [confirmMove, setConfirmMove] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [busy, setBusy] = useState(false);
  const { item, entry: data } = entry;
  const agentZone = item.zone === "agent";

  const copy = (value: string, what: string) => {
    copySecret(value).then(
      () => {
        toast(`${what} copié. Effacé du presse-papiers dans 30 s.`);
      },
      (e: unknown) => {
        toast(errorText(e), "crit");
      },
    );
  };

  const copyCode = () => {
    if (!data.totp) return;
    currentCode(data.totp).then(
      (s) => {
        copy(s.code, "Code");
      },
      () => {
        toast("Clé TOTP illisible.", "crit");
      },
    );
  };

  const decide = async (keep: "current" | "pending") => {
    setBusy(true);
    try {
      await resolvePending(session.api, session.vault, item, keep);
      await session.refresh();
      toast(keep === "pending" ? "Gardé : celui de l'agent." : "Gardé : celui du coffre.");
    } catch (e) {
      toast(errorText(e), "crit");
    } finally {
      setBusy(false);
    }
  };

  const move = async () => {
    if (!session.keyring) return;
    setBusy(true);
    try {
      const fn = agentZone ? reclaim : delegate;
      await fn(session.api, session.keyring, session.vault, item, true);
      await session.refresh();
      await queryClient.invalidateQueries();
      toast(
        agentZone
          ? "Reprise. Pense à changer ce mot de passe : le serveur l'a connu."
          : "Confiée à l'agent.",
        agentZone ? "warn" : "ok",
      );
      setConfirmMove(false);
    } catch (e) {
      toast(errorText(e), "crit");
    } finally {
      setBusy(false);
    }
  };

  const remove = async () => {
    setBusy(true);
    try {
      await trash(session.api, session.vault, item);
      await session.refresh();
      toast("Dans la corbeille pendant 30 jours.");
      setConfirmDelete(false);
      onGone();
    } catch (e) {
      toast(errorText(e), "crit");
    } finally {
      setBusy(false);
    }
  };

  const overlays = (
    <>
      <Confirm
        open={confirmMove}
        busy={busy}
        icon={agentZone ? ArrowUUpLeftIcon : SparkleIcon}
        tone={agentZone ? "warn" : "accent"}
        title={agentZone ? "Reprendre cette entrée ?" : "Confier cette entrée à l'agent ?"}
        explanation={
          agentZone
            ? "Elle repassera dans ta zone personnelle et l'agent ne pourra plus la lire. Change ensuite ce mot de passe : le serveur l'a connu."
            : // A second factor stored here is a second factor the server can produce: it has to
              // be said before the move, not discovered after.
              `Le serveur pourra la déchiffrer pour surveiller les fuites et changer son mot de passe.${
                data.totp
                  ? " Il pourra aussi calculer son code à deux facteurs, ce dont l'agent a besoin pour se reconnecter."
                  : ""
              } Tu peux la reprendre à tout moment.`
        }
        confirmLabel={agentZone ? "Reprendre" : "Confier"}
        onCancel={() => {
          setConfirmMove(false);
        }}
        onConfirm={() => void move()}
      />
      <Confirm
        open={confirmDelete}
        busy={busy}
        icon={TrashIcon}
        title={`Supprimer ${data.name} ?`}
        explanation="L'entrée part à la corbeille et sera effacée définitivement dans 30 jours. Tu peux la restaurer d'ici là."
        confirmLabel="Supprimer"
        onCancel={() => {
          setConfirmDelete(false);
        }}
        onConfirm={() => void remove()}
      />
      {editing ? (
        <EntryEditor
          open
          item={item}
          initial={data}
          generate={editing === "generate"}
          onClose={() => {
            setEditing(null);
          }}
        />
      ) : null}
    </>
  );

  return {
    busy,
    offline: session.offline,
    copy,
    copyCode,
    decide,
    edit: (generate = false) => {
      setEditing(generate ? "generate" : "edit");
    },
    askMove: () => {
      setConfirmMove(true);
    },
    askDelete: () => {
      setConfirmDelete(true);
    },
    overlays,
  };
}

type Actions = ReturnType<typeof useEntryActions>;

/* ============ Pieces of the fiche ============ */

/** One line of the fields card: label, value, and its buttons on the right. */
function FieldRow({
  label,
  children,
  actions,
}: {
  label: string;
  children: ReactNode;
  actions?: ReactNode;
}) {
  return (
    <div className="grid min-h-[56px] grid-cols-[1fr_auto] items-center gap-x-3 gap-y-1 py-3 pl-4 pr-2 [&+&]:border-t [&+&]:border-line @[620px]:grid-cols-[150px_1fr_auto]">
      <span className="col-span-2 text-[12.5px] text-faint @[620px]:col-span-1">{label}</span>
      <div className="min-w-0">{children}</div>
      <div className="flex items-center gap-0.5">{actions}</div>
    </div>
  );
}

function Fields({ entry, actions }: { entry: VaultEntry; actions: Actions }) {
  const [revealed, setRevealed] = useState(false);
  const [shownFields, setShownFields] = useState<Set<number>>(new Set());
  const { entry: data } = entry;
  const href = siteHref(data.urls?.[0]);
  const password = data.password ?? "";
  const strength = password ? strengthOf(password) : null;
  const extra = data.fields ?? [];
  if (!data.username && !password && !data.totp && !href && extra.length === 0) return null;
  return (
    <div className="glass overflow-hidden rounded-[14px]">
      {data.username ? (
        <FieldRow
          label="Identifiant"
          actions={
            <IconButton
              icon={CopyIcon}
              label="Copier l'identifiant"
              onClick={() => {
                actions.copy(data.username ?? "", "Identifiant");
              }}
            />
          }
        >
          <span className="block truncate text-[14.5px] font-medium">{data.username}</span>
        </FieldRow>
      ) : null}
      {password && strength ? (
        <FieldRow
          label="Mot de passe"
          actions={
            <>
              <IconButton
                icon={revealed ? EyeSlashIcon : EyeIcon}
                label={revealed ? "Masquer le mot de passe" : "Afficher le mot de passe"}
                onClick={() => {
                  setRevealed(!revealed);
                }}
              />
              <IconButton
                icon={CopyIcon}
                label="Copier le mot de passe"
                onClick={() => {
                  actions.copy(password, "Mot de passe");
                }}
              />
            </>
          }
        >
          {revealed ? (
            <PasswordText value={password} className="text-[14.5px] font-medium" />
          ) : (
            <span className="block font-mono text-[14.5px] tracking-[0.14em] text-muted">
              {MASK}
            </span>
          )}
          <StrengthBars
            strength={strength}
            caption={`${strength.label}, ${String(Array.from(password).length)} caractères`}
            className="mt-2"
          />
        </FieldRow>
      ) : null}
      {data.totp ? (
        <FieldRow
          label="Code à usage unique"
          actions={<IconButton icon={CopyIcon} label="Copier le code" onClick={actions.copyCode} />}
        >
          <TotpCode value={data.totp} />
        </FieldRow>
      ) : null}
      {href ? (
        <FieldRow
          label="Site"
          actions={
            <a
              href={href}
              target="_blank"
              rel="noopener noreferrer"
              aria-label="Ouvrir le site"
              title="Ouvrir le site"
              className="inline-grid h-8 w-8 place-items-center rounded-[8px] text-muted transition-colors duration-150 hover:bg-hover hover:text-text [@media(pointer:coarse)]:h-11 [@media(pointer:coarse)]:w-11"
            >
              <ArrowSquareOutIcon size={18} aria-hidden="true" />
            </a>
          }
        >
          <a
            href={href}
            target="_blank"
            rel="noopener noreferrer"
            className="block truncate text-[14px] text-accent-text hover:underline"
          >
            {entry.domain ?? href}
          </a>
        </FieldRow>
      ) : null}
      {extra.map((f, i) => {
        const shown = !f.hidden || shownFields.has(i);
        return (
          <FieldRow
            key={`${f.name}-${String(i)}`}
            label={f.name || "Champ"}
            actions={
              <>
                {f.hidden ? (
                  <IconButton
                    icon={shown ? EyeSlashIcon : EyeIcon}
                    label={shown ? "Masquer" : "Afficher"}
                    onClick={() => {
                      const next = new Set(shownFields);
                      if (shown) next.delete(i);
                      else next.add(i);
                      setShownFields(next);
                    }}
                  />
                ) : null}
                <IconButton
                  icon={CopyIcon}
                  label={`Copier ${f.name || "le champ"}`}
                  onClick={() => {
                    actions.copy(f.value, f.name || "Champ");
                  }}
                />
              </>
            }
          >
            <span
              className={`block truncate text-[14px] ${shown ? "" : "font-mono tracking-[0.14em] text-muted"}`}
            >
              {shown ? f.value : MASK}
            </span>
          </FieldRow>
        );
      })}
    </div>
  );
}

/** A small tinted well for the icon of a card. */
function Well({ icon: Glyph, tone }: { icon: Icon; tone: "accent" | "violet" | "warn" }) {
  const colours =
    tone === "violet"
      ? "bg-violet-soft text-violet-text"
      : tone === "warn"
        ? "bg-warn-soft text-warn-text"
        : "bg-accent-soft text-accent-text";
  return (
    <span className={`grid h-[30px] w-[30px] shrink-0 place-items-center rounded-[9px] ${colours}`}>
      <Glyph size={17} weight="bold" aria-hidden="true" />
    </span>
  );
}

function ZoneCardFrame({
  icon,
  tone,
  title,
  children,
  actions,
  halo,
}: {
  icon: Icon;
  tone: "accent" | "violet" | "warn";
  title: string;
  children: ReactNode;
  actions?: ReactNode;
  halo?: "violet" | "warn";
}) {
  return (
    <section
      aria-label={title}
      className={`glass rounded-card p-4 @[620px]:p-[18px] ${halo ? `halo ${halo === "violet" ? "[--halo:var(--color-violet)]" : "[--halo:var(--color-warn)]"}` : ""}`}
    >
      <div className="mb-1.5 flex items-center gap-2.5">
        <Well icon={icon} tone={tone} />
        <h3 className="m-0 flex-1 text-[15px] font-semibold leading-tight">{title}</h3>
      </div>
      <div className="text-[13.5px] leading-relaxed text-muted">{children}</div>
      {actions ? <div className="mt-3.5 flex flex-wrap items-center gap-2">{actions}</div> : null}
    </section>
  );
}

function Stats({ items }: { items: [string, ReactNode][] }) {
  return (
    <div className="mt-3.5 grid grid-cols-3 gap-px overflow-hidden rounded-[10px] bg-line">
      {items.map(([label, value]) => (
        <div key={label} className="min-w-0 bg-glass-2 px-3 py-2.5 [[data-theme=light]_&]:bg-panel">
          <small className="mb-0.5 block truncate text-[11.5px] text-faint">{label}</small>
          <b className="block truncate text-[13.5px] font-semibold text-text">{value}</b>
        </div>
      ))}
    </div>
  );
}

/**
 * Who can read this entry, and what that means right now: the card changes with the case
 * (protected, entrusted, leaked, a rotation waiting or running). Moving it always asks first.
 */
function ZoneCard({
  entry,
  signals,
  actions,
  onClose,
}: {
  entry: VaultEntry;
  signals: Signals;
  actions: Actions;
  onClose: () => void;
}) {
  const shell = useShell();
  const { item, entry: data } = entry;
  const leaked = signals.alerts.has("pwned_password");
  const rotation = signals.rotation;
  const moveBack = (
    <Button
      variant="ghost"
      icon={ArrowUUpLeftIcon}
      disabled={actions.offline}
      onClick={actions.askMove}
    >
      Reprendre dans ma zone
    </Button>
  );

  if (item.zone === "agent") {
    if (rotation?.status === "scheduled")
      return (
        <ZoneCardFrame
          icon={SparkleIcon}
          tone="violet"
          halo="violet"
          title="Une rotation attend ton accord"
          actions={
            <>
              <Button
                onClick={() => {
                  shell.go("agent");
                  onClose();
                }}
              >
                Voir la proposition
              </Button>
              {moveBack}
            </>
          }
        >
          {rotation.trigger === "breach"
            ? "Ce mot de passe est apparu dans une fuite. L'agent a préparé un remplaçant, rien ne bouge sans toi."
            : "L'agent veut changer ce mot de passe, comme prévu par sa politique. Rien ne bouge sans toi."}
        </ZoneCardFrame>
      );
    if (rotation)
      return (
        <ZoneCardFrame
          icon={ArrowsClockwiseIcon}
          tone="violet"
          halo="violet"
          title={`Rotation en cours${entry.domain ? ` sur ${entry.domain}` : ""}`}
        >
          L'agent change ce mot de passe, puis se reconnecte avec le nouveau pour prouver qu'il
          marche. Sinon, il revient en arrière. Tu es prévenu dans les deux cas.
          <span className="mt-3 block h-1 overflow-hidden rounded-full bg-press" aria-hidden="true">
            <span className="block h-full w-full animate-pulse rounded-full bg-violet motion-reduce:animate-none" />
          </span>
        </ZoneCardFrame>
      );
    const policy = signals.policy;
    const due = daysUntil(policy?.next_due_at);
    return (
      <ZoneCardFrame
        icon={SparkleIcon}
        tone="violet"
        halo="violet"
        title={leaked ? "L'agent a vu la fuite" : "L'agent s'occupe de ce compte"}
        actions={moveBack}
      >
        {leaked
          ? "Ce mot de passe est apparu dans une fuite. L'agent prépare un remplaçant à sa prochaine veille, et te le montre avant de le poser."
          : policy?.frequency_days
            ? `Il surveille les fuites et change ce mot de passe tous les ${String(policy.frequency_days)} jours. Tu es prévenu à chaque rotation.`
            : "Il surveille les fuites de ce compte et peut changer son mot de passe. Aucune rotation régulière n'est réglée pour l'instant."}
        <Stats
          items={[
            [
              "Prochaine",
              policy?.frequency_days
                ? due !== null && due <= 0
                  ? "Aujourd'hui"
                  : day(policy.next_due_at)
                : "Aucune",
            ],
            ["Changé le", data.passwordChangedAt ? day(data.passwordChangedAt) : "Inconnu"],
            ["Mode", policy?.mode === "autonomous" ? "Autonome" : "Avec accord"],
          ]}
        />
      </ZoneCardFrame>
    );
  }

  const entrust = (
    <Button
      variant={leaked ? "ghost" : "secondary"}
      icon={SparkleIcon}
      disabled={actions.offline}
      onClick={actions.askMove}
    >
      Confier à l'agent
    </Button>
  );
  if (leaked)
    return (
      <ZoneCardFrame
        icon={WarningIcon}
        tone="warn"
        halo="warn"
        title="Ce mot de passe a fuité"
        actions={
          <>
            <Button
              icon={MagicWandIcon}
              disabled={actions.offline}
              onClick={() => {
                actions.edit(true);
              }}
            >
              Générer un remplaçant
            </Button>
            {entrust}
          </>
        }
      >
        Il apparaît dans une fuite connue. Il est dans ta zone : l'agent ne peut pas le changer,
        c'est à toi de jouer. Change-le sur le site, puis ici.
      </ZoneCardFrame>
    );
  return (
    <ZoneCardFrame icon={ShieldCheckIcon} tone="accent" title="Protégé par toi" actions={entrust}>
      Chiffré avec ta clé, qui ne quitte jamais tes appareils. L'agent te prévient en cas de fuite
      mais ne lit rien ici.
    </ZoneCardFrame>
  );
}

function PolicyCard({ entry, signals }: { entry: VaultEntry; signals: Signals }) {
  const [open, setOpen] = useState(false);
  const agentZone = entry.item.zone === "agent";
  const policy = signals.policy;
  const due = daysUntil(policy?.next_due_at);
  if (open)
    return (
      <PolicyEditor
        entry={entry}
        {...(policy ? { policy } : {})}
        onDone={() => {
          setOpen(false);
        }}
      />
    );
  const title = policy?.frequency_days
    ? due !== null && due <= 0
      ? agentZone
        ? "Rotation due"
        : "Rappel dû"
      : `${agentZone ? "Rotation" : "Rappel"} ${relative(policy.next_due_at)}`
    : agentZone
      ? "Aucune rotation prévue"
      : "Aucun rappel";
  return (
    <button
      type="button"
      aria-expanded={false}
      className="glass flex w-full items-center gap-3 rounded-card px-4 py-3.5 text-left transition-colors duration-150 hover:bg-glass-hi"
      onClick={() => {
        setOpen(true);
      }}
    >
      <Well icon={ArrowsClockwiseIcon} tone={agentZone ? "violet" : "accent"} />
      <span className="flex min-w-0 flex-1 flex-col">
        <span className="text-[14px] font-medium">{title}</span>
        <span className="text-caption text-faint">
          {policy?.frequency_days
            ? `Tous les ${String(policy.frequency_days)} jours, ${agentZone ? (policy.mode === "autonomous" ? "sans te demander" : "avec ton accord") : "rappel seulement"}`
            : agentZone
              ? "Régler la fréquence de rotation"
              : "Régler un rappel pour le changer"}
        </span>
      </span>
      <CaretDownIcon size={18} className="shrink-0 text-faint" aria-hidden="true" />
    </button>
  );
}

interface Moment {
  key: string;
  title: string;
  caption: string;
  when: string;
  dot: "violet" | "accent" | "neutral";
}

/** Past versions, newest first, told as what changed from one to the next. */
function moments(entry: VaultEntry, past: HistoryEntry[]): Moment[] {
  const versions = [
    {
      revision: entry.item.revision,
      zone: entry.item.zone,
      created_at: entry.item.updated_at,
      entry: entry.entry,
    },
    ...[...past]
      .filter((h) => h.revision !== entry.item.revision)
      .sort((a, b) => b.revision - a.revision),
  ];
  return versions.map((v, i) => {
    const older = versions[i + 1];
    const when = new Date(v.created_at).toLocaleDateString("fr-FR", {
      day: "numeric",
      month: "short",
    });
    const base = { key: String(v.revision), when };
    const caption = i === 0 ? "Version actuelle" : `Révision ${String(v.revision)}, gardée`;
    if (!older)
      return {
        ...base,
        title: v.revision <= 1 ? "Entrée créée" : "Plus ancienne version gardée",
        caption: v.revision <= 1 ? (i === 0 ? "Version actuelle" : "Dans ta zone") : caption,
        dot: "neutral",
      };
    if (older.zone !== v.zone)
      return {
        ...base,
        title: v.zone === "agent" ? "Confiée à l'agent" : "Reprise dans ta zone",
        caption,
        dot: v.zone === "agent" ? "violet" : "accent",
      };
    if (older.entry.password !== v.entry.password)
      return {
        ...base,
        title: "Mot de passe changé",
        caption,
        dot: v.zone === "agent" ? "violet" : "accent",
      };
    return { ...base, title: "Entrée modifiée", caption, dot: "neutral" };
  });
}

const DOTS: Record<Moment["dot"], string> = {
  violet: "border-violet",
  accent: "border-accent",
  neutral: "border-faint",
};

function History({ entry }: { entry: VaultEntry }) {
  const session = useSession();
  const [past, setPast] = useState<HistoryEntry[] | null>(null);
  const [failed, setFailed] = useState(false);
  const { item } = entry;
  useEffect(() => {
    let alive = true;
    setPast(null);
    setFailed(false);
    if (!session.keyring || session.offline) {
      setFailed(true);
      return;
    }
    history(session.api, session.keyring, item).then(
      (h) => {
        if (alive) setPast(h);
      },
      () => {
        if (alive) setFailed(true);
      },
    );
    return () => {
      alive = false;
    };
    // The revision changes after each save: the frise follows.
  }, [session.api, session.keyring, session.offline, item]);

  const list = past ? moments(entry, past) : null;
  return (
    <section aria-label="Historique" className="flex flex-col gap-2">
      <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-0.5 px-0.5">
        <h3 className="m-0 text-[15px] font-semibold">Historique</h3>
        <span className="text-[12px] text-faint">
          Les anciennes versions restent déchiffrables par toi
        </span>
      </div>
      {failed ? (
        <p className="m-0 px-0.5 text-caption text-faint">
          Modifiée {relative(item.updated_at)}. L'historique se charge quand le serveur répond.
        </p>
      ) : !list ? (
        <div className="h-16 animate-pulse rounded-[12px] bg-hover" aria-busy="true" />
      ) : (
        <ol className="m-0 flex list-none flex-col p-0">
          {list.map((m, i) => (
            <li
              key={m.key}
              className="relative grid grid-cols-[18px_1fr_auto] items-start gap-3 px-0.5 py-2"
            >
              {i < list.length - 1 ? (
                <span
                  aria-hidden="true"
                  className="absolute bottom-[-8px] left-[10.5px] top-[24px] w-px bg-line-strong"
                />
              ) : null}
              <span
                aria-hidden="true"
                className={`relative z-[1] ml-1.5 mt-[5px] h-[9px] w-[9px] rounded-full border-2 bg-bg ${DOTS[m.dot]}`}
              />
              <span className="min-w-0">
                <b className="block text-[13px] font-medium leading-snug">{m.title}</b>
                <small className="block text-[12px] text-faint">{m.caption}</small>
              </span>
              <time className="whitespace-nowrap pt-px text-[12px] text-faint">{m.when}</time>
            </li>
          ))}
        </ol>
      )}
    </section>
  );
}

/** A rotation that could not be undone left two passwords: the user says which one works. */
function TwoPasswords({ entry, actions }: { entry: VaultEntry; actions: Actions }) {
  const session = useSession();
  const pending = session.keyring ? decryptPending(session.keyring, entry.item) : null;
  if (!pending) return null;
  const choice = (label: string, value: string | undefined, keep: "current" | "pending") => (
    <div className="flex items-center justify-between gap-2 rounded-control bg-glass-2 px-3.5 py-2.5 shadow-[inset_0_0_0_1px_var(--color-line)]">
      <div className="flex min-w-0 flex-col">
        <span className="text-caption text-faint">{label}</span>
        <PasswordText value={value ?? ""} className="truncate text-[14px]" />
      </div>
      <Button
        variant={keep === "pending" ? "primary" : "secondary"}
        busy={actions.busy}
        onClick={() => void actions.decide(keep)}
        className="shrink-0"
      >
        Garder
      </Button>
    </div>
  );
  return (
    <ZoneCardFrame
      icon={WarningIcon}
      tone="warn"
      halo="warn"
      title="Deux mots de passe pour cette entrée"
    >
      La rotation n'a pas pu être annulée : le site a peut-être pris le nouveau, peut-être gardé
      l'ancien. Essaie de te connecter, puis dis lequel marche. L'autre sera jeté.
      <div className="mt-3 flex flex-col gap-2">
        {choice("Celui du coffre", entry.entry.password, "current")}
        {choice("Celui que l'agent a posé", pending.password, "pending")}
      </div>
    </ZoneCardFrame>
  );
}

function Notes({ text }: { text: string }) {
  return (
    <section aria-label="Notes" className="flex flex-col gap-2">
      <h3 className="m-0 flex items-center gap-2 px-0.5 text-[15px] font-semibold">
        <NotePencilIcon size={16} aria-hidden="true" className="text-faint" />
        Notes
      </h3>
      <p className="glass m-0 whitespace-pre-wrap break-words rounded-[14px] px-4 py-3 text-[13.5px] leading-relaxed">
        {text}
      </p>
    </section>
  );
}

/** The chips under the name: the zone, the worst alert, a favourite, the site. */
function Meta({
  entry,
  signals,
  site = true,
}: {
  entry: VaultEntry;
  signals: Signals;
  site?: boolean;
}) {
  const zone = zoneChip(entry.item.zone);
  const alert = alertWord(signals);
  const href = siteHref(entry.entry.urls?.[0]);
  return (
    <div className="flex flex-wrap items-center gap-x-2 gap-y-1.5">
      <Pill tone={zone.pill} icon={zone.icon}>
        {zone.label}
      </Pill>
      {alert ? (
        <Pill tone="warn" icon={WarningIcon}>
          {alert}
        </Pill>
      ) : null}
      {entry.entry.favorite ? (
        <Pill tone="neutral" icon={StarIcon}>
          Favori
        </Pill>
      ) : null}
      {site && href && entry.domain ? (
        <a
          href={href}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex min-w-0 items-center gap-1.5 text-[13px] text-muted hover:text-text"
        >
          <GlobeIcon size={14} aria-hidden="true" className="shrink-0" />
          <span className="truncate">{entry.domain}</span>
        </a>
      ) : null}
    </div>
  );
}

function Body({
  entry,
  signals,
  actions,
  onClose,
}: {
  entry: VaultEntry;
  signals: Signals;
  actions: Actions;
  onClose: () => void;
}) {
  return (
    <>
      <TwoPasswords entry={entry} actions={actions} />
      <Fields entry={entry} actions={actions} />
      <ZoneCard entry={entry} signals={signals} actions={actions} onClose={onClose} />
      <PolicyCard entry={entry} signals={signals} />
      {entry.entry.notes ? <Notes text={entry.entry.notes} /> : null}
      <History entry={entry} />
      <div className="flex items-center justify-between gap-3 border-t border-line pt-3 text-caption">
        <span className="text-faint">Modifiée {relative(entry.item.updated_at)}</span>
        <Button
          variant="ghost"
          size="sm"
          icon={TrashIcon}
          className="!text-crit hover:!bg-crit-soft"
          disabled={actions.offline}
          onClick={actions.askDelete}
        >
          Supprimer
        </Button>
      </div>
    </>
  );
}

/* ============ The two frames ============ */

/**
 * The fiche beside the list, on a wide app. `headingRef` lets the list send the focus here
 * (Enter), so Tab walks through the fiche's own buttons.
 */
export function EntryPane({
  entry,
  onGone,
  paneRef,
}: {
  entry: VaultEntry;
  onGone: () => void;
  paneRef?: React.Ref<HTMLElement>;
}) {
  const { of } = useSignals();
  const signals = of(entry.item.id);
  const actions = useEntryActions(entry, onGone);
  return (
    <section
      ref={paneRef}
      tabIndex={-1}
      aria-label={entry.entry.name}
      className="glass flex min-h-0 flex-col overflow-hidden rounded-card outline-none"
    >
      <div className="flex min-h-0 flex-1 flex-col gap-5 overflow-y-auto px-7 pb-7 pt-6 [&>*]:shrink-0">
        <div className="flex items-center gap-4">
          <Monogram name={entry.entry.name} size={54} />
          <div className="flex min-w-0 flex-1 flex-col gap-1.5">
            <h2 className="m-0 truncate font-display text-[26px] font-bold leading-tight tracking-[-0.01em]">
              {entry.entry.name}
            </h2>
            <Meta entry={entry} signals={signals} />
          </div>
          <Button
            variant="secondary"
            icon={PencilSimpleIcon}
            disabled={actions.offline}
            onClick={() => {
              actions.edit();
            }}
          >
            Modifier
          </Button>
        </div>
        <Body entry={entry} signals={signals} actions={actions} onClose={() => undefined} />
      </div>
      {actions.overlays}
    </section>
  );
}

/**
 * The fiche as a dialog: full screen on a phone, sliding up, with the one thing people come
 * for (copy the password) at the bottom under the thumb. Also opened from the other screens.
 */
export function EntryDialog({ entry, onClose }: { entry: VaultEntry | null; onClose: () => void }) {
  if (!entry)
    return (
      <Modal open={false} onClose={onClose} title="Entrée">
        {null}
      </Modal>
    );
  return <OpenEntryDialog entry={entry} onClose={onClose} />;
}

function OpenEntryDialog({ entry, onClose }: { entry: VaultEntry; onClose: () => void }) {
  const { of } = useSignals();
  const signals = of(entry.item.id);
  const actions = useEntryActions(entry, onClose);
  const password = entry.entry.password;
  return (
    <>
      <Modal
        open
        onClose={onClose}
        title={entry.entry.name}
        subtitle={entry.domain ?? "sans adresse"}
        fullscreenOnMobile
        header={
          <div className="flex min-w-0 flex-1 items-center gap-3.5">
            <Monogram name={entry.entry.name} size={52} />
            <div className="flex min-w-0 flex-1 flex-col gap-1.5">
              <h2 className="m-0 truncate font-display text-[24px] font-bold leading-tight tracking-[-0.01em]">
                {entry.entry.name}
              </h2>
              <Meta entry={entry} signals={signals} site={false} />
            </div>
            <IconButton
              icon={PencilSimpleIcon}
              label="Modifier"
              disabled={actions.offline}
              onClick={() => {
                actions.edit();
              }}
            />
          </div>
        }
        {...(password
          ? {
              footer: (
                <Button
                  size="lg"
                  icon={CopyIcon}
                  className="w-full"
                  onClick={() => {
                    actions.copy(password, "Mot de passe");
                  }}
                >
                  Copier le mot de passe
                </Button>
              ),
            }
          : {})}
      >
        <Body entry={entry} signals={signals} actions={actions} onClose={onClose} />
      </Modal>
      {actions.overlays}
    </>
  );
}
