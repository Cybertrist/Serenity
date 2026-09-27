import {
  ArrowRightIcon,
  ArrowsClockwiseIcon,
  AtIcon,
  ClockIcon,
  CopyIcon,
  EnvelopeSimpleIcon,
  type Icon,
  KeyIcon,
  MagnifyingGlassIcon,
  SealCheckIcon,
  SealWarningIcon,
  ShieldCheckIcon,
  ShieldWarningIcon,
  SparkleIcon,
  WarningIcon,
} from "@phosphor-icons/react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { AnimatePresence, motion } from "motion/react";
import { useEffect, useMemo, useRef, useState } from "react";
import { useHealth } from "../../app/health";
import { useBreaches, useRotations, useScanPlan } from "../../app/hooks/queries";
import { useEntries, type VaultEntry } from "../../app/hooks/useEntries";
import { useScan } from "../../app/hooks/useScan";
import { useSession } from "../../app/session";
import { Header } from "../../app/shell/Header";
import { useShell } from "../../app/shell/context";
import { useShortcut } from "../../app/shortcuts";
import { useToast } from "../../app/toast";
import {
  Button,
  Card,
  Chip,
  EmptyState,
  HealthRing,
  IconButton,
  LIST,
  LIST_ITEM,
  Monogram,
  Pill,
  Skeleton,
  StatusCard,
  healthTone,
  useMood,
  type Tone,
} from "../../design";
import { errorText } from "../account/screens/wording";
import { plural, relative } from "../../lib/format";
import { BREACH_LABELS } from "../../lib/labels";
import type { BreachRecord } from "./scan";

type Kind = BreachRecord["kind"];
type Filter = Kind | "all";

/** Worst first: a known leak before a reused password, before a weak one, before an old one. */
const RANK: Record<Kind, number> = {
  pwned_password: 0,
  email_breach: 1,
  reused: 2,
  weak: 3,
  old: 4,
};

const ICONS: Record<Kind, Icon> = {
  pwned_password: SealWarningIcon,
  reused: CopyIcon,
  weak: ShieldWarningIcon,
  old: ClockIcon,
  email_breach: AtIcon,
};

/** The short word on an alert card. */
const TAGS: Record<Kind, string> = {
  pwned_password: "Vu dans une fuite",
  reused: "Réutilisé",
  weak: "Faible",
  old: "Ancien",
  email_breach: "Adresse exposée",
};

const BAR: Record<Tone, string> = {
  crit: "bg-crit",
  warn: "bg-warn",
  accent: "bg-accent",
  ok: "bg-ok",
  neutral: "bg-line-strong",
};

/** An example for the k-anonymity card: SHA-1 of "motdepasse", nobody's real password. */
const EXAMPLE_HASH = "940C0F26FD5A30775BB1CBD1F6840398D39BB813";

interface Emails {
  enabled: boolean;
  emails: { id: number; email: string; last_checked_at: string | null }[];
}

/** One card on screen: an alert, or every "reused" alert gathered, since they are one problem. */
interface Alert {
  key: string;
  /** The worst kind: it sets the tone, the words and the order. */
  kind: Kind;
  /** Every kind open on this entry, worst first. */
  kinds: Kind[];
  records: BreachRecord[];
  entries: VaultEntry[];
}

export function BreachesScreen() {
  const session = useSession();
  const shell = useShell();
  const toast = useToast();
  const queryClient = useQueryClient();
  const breaches = useBreaches();
  const plan = useScanPlan();
  const rotations = useRotations();
  const health = useHealth();
  const { byId } = useEntries();
  const { scan, scanning, lastScan } = useScan();
  const [filter, setFilter] = useState<Filter>("all");
  const started = useRef(false);
  const wide = shell.form !== "mobile";

  const emails = useQuery({
    queryKey: ["emails"],
    queryFn: () => session.api.get<Emails>("/api/watch/emails"),
    enabled: session.phase === "unlocked" && !session.offline,
  });

  // A scan runs once when the tab opens with an unlocked vault. The local checks cover
  // everything; the network ones only cover what the server says is due, so re-opening the
  // tab the same day costs nothing (docs/05-veille.md).
  useEffect(() => {
    if (started.current || session.offline) return;
    started.current = true;
    void scan();
  }, [scan, session.offline]);

  const list = useMemo(() => breaches.data ?? [], [breaches.data]);
  useMood(list.length > 0 ? "leak" : breaches.isSuccess ? "calm" : null);

  const rescan = () => {
    if (scanning || session.offline) return;
    void scan({ full: true });
  };
  useShortcut("r", rescan, { enabled: !session.offline });

  const dismiss = async (ids: number[]) => {
    try {
      for (const id of ids) await session.api.post(`/api/breaches/${String(id)}/dismiss`);
      await queryClient.invalidateQueries({ queryKey: ["breaches"] });
      toast(ids.length > 1 ? "Alertes mises de côté." : "Alerte mise de côté.");
    } catch (e) {
      toast(errorText(e), "crit");
    }
  };

  const checkedAt = lastScan?.toISOString() ?? plan.data?.last_scan_at ?? null;
  const checked = scanning
    ? "Vérification en cours…"
    : checkedAt
      ? `Dernière vérification ${relative(checkedAt)}.`
      : "Pas encore vérifié.";

  const alerts = useMemo(() => {
    const out: Alert[] = [];
    const reused: Alert = {
      key: "reused",
      kind: "reused",
      kinds: ["reused"],
      records: [],
      entries: [],
    };
    // One card per entry: a leaked password that is also weak is one thing to fix.
    const perEntry = new Map<string, Alert>();
    for (const b of list) {
      const entry = b.item_id ? byId.get(b.item_id) : undefined;
      if (b.kind === "reused") {
        reused.records.push(b);
        if (entry) reused.entries.push(entry);
        continue;
      }
      const known = b.item_id ? perEntry.get(b.item_id) : undefined;
      if (known) {
        known.records.push(b);
        known.kinds = [...known.kinds, b.kind].sort((x, y) => RANK[x] - RANK[y]);
        known.kind = known.kinds[0] ?? b.kind;
        continue;
      }
      const alert: Alert = {
        key: String(b.id),
        kind: b.kind,
        kinds: [b.kind],
        records: [b],
        entries: entry ? [entry] : [],
      };
      if (b.item_id && b.kind !== "email_breach") perEntry.set(b.item_id, alert);
      out.push(alert);
    }
    if (reused.records.length) out.push(reused);
    return out.sort((a, b) => RANK[a.kind] - RANK[b.kind]);
  }, [list, byId]);

  const counts: Record<Kind, number> = {
    pwned_password: health.leaked,
    reused: health.reused,
    weak: health.weak,
    old: health.old,
    email_breach: health.emails,
  };
  const shown = filter === "all" ? alerts : alerts.filter((a) => a.kinds.includes(filter));
  const waiting = new Set(
    (rotations.data ?? []).filter((r) => r.status === "scheduled").map((r) => r.item_id),
  );

  const known = breaches.isSuccess && !session.offline;
  const allWell = known && list.length === 0;
  const attention = health.flagged + health.emails;
  const worst = alerts[0];
  const worstName = worst?.entries[0]?.entry.name;

  const headline = !known
    ? "Pas de nouvelles de la veille."
    : allWell
      ? "Tout va bien."
      : attention <= 1
        ? "Une chose demande ton attention."
        : `${String(attention)} choses demandent ton attention.`;
  const detail = !known
    ? session.offline
      ? "Hors ligne : les alertes ne peuvent pas être consultées."
      : "La veille n'a pas répondu. Réessaie dans un instant."
    : allWell
      ? "Aucun mot de passe dans une fuite connue, aucun réutilisé, aucun trop faible ou trop ancien."
      : worst?.kind === "pwned_password" && worstName
        ? `${worstName} est dans une fuite connue : c'est le premier à changer.`
        : worst?.kind === "email_breach"
          ? "Une de tes adresses est apparue dans une fuite publiée."
          : worst?.kind === "reused"
            ? "Un même mot de passe sert à plusieurs comptes : s'il fuit, tous tombent."
            : "Rien d'urgent, mais la santé du coffre remonte dès que tu t'en occupes.";

  return (
    <>
      <Header
        title="Fuites"
        subtitle={
          <>
            Ce que la veille a trouvé sur tes comptes.{" "}
            <span className="tabular text-faint">{checked}</span>
          </>
        }
        actions={
          wide ? (
            <Button
              variant="secondary"
              icon={ArrowsClockwiseIcon}
              kbd="r"
              disabled={scanning || session.offline}
              onClick={rescan}
              className={scanning ? "[&>svg]:animate-spin" : ""}
            >
              Vérifier maintenant
            </Button>
          ) : (
            <IconButton
              icon={ArrowsClockwiseIcon}
              label="Vérifier maintenant"
              disabled={scanning || session.offline}
              onClick={rescan}
              className={`!h-10 !w-10 !rounded-[12px] bg-hover text-text ${scanning ? "[&>svg]:animate-spin" : ""}`}
            />
          )
        }
      />

      <div className="flex flex-col gap-4 pb-6 @[900px]:gap-5">
        {/* The health: a ring, one sentence that says it all, and the next move. */}
        {breaches.isPending && !session.offline ? (
          <Skeleton lines={2} />
        ) : (
          <Card halo className="flex items-center gap-4 @[620px]:gap-6 @[620px]:!p-6">
            <HealthRing
              score={known ? health.score : null}
              size={wide ? 112 : 84}
              ticks={wide ? 60 : 48}
            />
            <div className="flex min-w-0 flex-1 flex-col gap-1.5">
              <span className="eyebrow">Santé du coffre</span>
              <p className="m-0 text-balance font-display text-[17px] font-bold leading-tight tracking-[-0.01em] @[620px]:text-[24px]">
                {headline}
              </p>
              <p className="m-0 max-w-[60ch] text-caption text-muted">{detail}</p>
              {known && !allWell && health.score !== null ? (
                <p className="m-0 flex items-center gap-1.5 text-caption text-faint">
                  <span
                    aria-hidden="true"
                    className={`h-1.5 w-1.5 rounded-full ${BAR[healthTone(health.score)]}`}
                  />
                  {plural(health.flagged, "entrée touchée", "entrées touchées")}
                  {health.emails
                    ? `, ${plural(health.emails, "adresse exposée", "adresses exposées")}`
                    : ""}
                  .
                </p>
              ) : null}
            </div>
          </Card>
        )}

        {/* Counters that are also the filters. */}
        {known && !allWell ? (
          <div
            role="group"
            aria-label="Filtrer les alertes"
            className="grid grid-cols-5 gap-2 @[900px]:gap-3"
          >
            {ORDER.map((kind) => (
              <Tile
                key={kind}
                kind={kind}
                count={counts[kind]}
                active={filter === kind}
                wide={wide}
                onClick={() => {
                  setFilter(filter === kind ? "all" : kind);
                }}
              />
            ))}
          </div>
        ) : null}

        <div className="grid items-start gap-4 @[1100px]:grid-cols-[minmax(0,1fr)_320px] @[1100px]:gap-5">
          <div className="flex min-w-0 flex-col gap-3">
            {known && !allWell ? (
              <div className="flex items-center justify-between gap-3 px-1">
                <span className="eyebrow">
                  {filter === "all"
                    ? plural(alerts.length, "alerte", "alertes")
                    : `${TAGS[filter]} · ${String(shown.length)}`}
                </span>
                {filter === "all" ? (
                  <span className="text-micro text-faint">Les plus graves d'abord</span>
                ) : (
                  <Button
                    variant="link"
                    onClick={() => {
                      setFilter("all");
                    }}
                  >
                    Tout afficher
                  </Button>
                )}
              </div>
            ) : null}

            {!known && !breaches.isPending ? (
              <StatusCard
                icon={ShieldWarningIcon}
                tone="neutral"
                title="Alertes indisponibles"
                text={detail}
              />
            ) : null}

            {/* No "all is well" unless the alerts actually answered. */}
            {allWell ? (
              <AllWell
                checked={checked}
                scanning={scanning}
                offline={session.offline}
                onScan={rescan}
                onWatch={() => {
                  shell.openSettings("watch");
                }}
              />
            ) : null}

            {known && !allWell && shown.length === 0 ? (
              <EmptyState
                icon={SealCheckIcon}
                tone="ok"
                title="Rien dans cette catégorie."
                text="Choisis un autre compteur, ou affiche toutes les alertes."
              />
            ) : null}

            <motion.div
              variants={LIST}
              initial="initial"
              animate="animate"
              className="flex flex-col gap-3"
            >
              <AnimatePresence initial={false}>
                {shown.map((alert) => (
                  <motion.div
                    key={alert.key}
                    variants={LIST_ITEM}
                    layout="position"
                    exit={{ opacity: 0, scale: 0.98, transition: { duration: 0.15 } }}
                  >
                    <AlertCard
                      alert={alert}
                      waiting={alert.entries.some((e) => waiting.has(e.item.id))}
                      offline={session.offline}
                      onDismiss={() => void dismiss(alert.records.map((r) => r.id))}
                    />
                  </motion.div>
                ))}
              </AnimatePresence>
            </motion.div>
          </div>

          <aside className="flex flex-col gap-4">
            <HowItWorks />
            <WatchedEmails
              data={emails.data}
              breaches={list}
              onManage={() => {
                shell.openSettings("watch");
              }}
            />
          </aside>
        </div>
      </div>
    </>
  );
}

const ORDER: Kind[] = ["pwned_password", "reused", "weak", "old", "email_breach"];

const TILE: Record<Kind, { label: string; short: string; hint: string }> = {
  pwned_password: { label: "Dans une fuite", short: "Fuites", hint: "Pwned Passwords" },
  reused: { label: "Réutilisés", short: "Réutil.", hint: "même mot de passe" },
  weak: { label: "Faibles", short: "Faibles", hint: "trop courts ou simples" },
  old: { label: "Anciens", short: "Anciens", hint: "plus d'un an" },
  email_breach: { label: "Adresses", short: "E-mails", hint: "exposées" },
};

function Tile({
  kind,
  count,
  active,
  wide,
  onClick,
}: {
  kind: Kind;
  count: number;
  active: boolean;
  wide: boolean;
  onClick: () => void;
}) {
  const IconComponent = ICONS[kind];
  const tone = count === 0 ? "ok" : BREACH_LABELS[kind]?.tone === "crit" ? "crit" : "warn";
  const ink = count === 0 ? "text-text" : tone === "crit" ? "text-crit" : "text-warn-text";
  return (
    <button
      type="button"
      aria-pressed={active}
      disabled={count === 0 && !active}
      onClick={onClick}
      aria-label={`${TILE[kind].label} : ${String(count)}${active ? ", filtre actif" : ""}`}
      className={`glass group relative flex min-w-0 flex-col items-start gap-1 rounded-card p-2.5 text-left transition-[box-shadow,background-color,transform] duration-150 hover:bg-glass-2 active:translate-y-px disabled:cursor-default disabled:hover:bg-glass @[620px]:p-3.5 ${
        active ? "!bg-glass-hi shadow-[inset_0_0_0_1.5px_var(--color-accent)]" : ""
      }`}
    >
      <span className="flex w-full items-center gap-1.5 text-muted">
        <IconComponent size={14} aria-hidden="true" className="hidden shrink-0 @[620px]:block" />
        <span className="truncate text-[10.5px] font-medium @[620px]:text-caption">
          {wide ? TILE[kind].label : TILE[kind].short}
        </span>
        {count > 0 ? (
          <span
            aria-hidden="true"
            className={`ml-auto hidden h-1.5 w-1.5 shrink-0 rounded-full @[620px]:block ${tone === "crit" ? "bg-crit" : "bg-warn"}`}
          />
        ) : null}
      </span>
      <span
        className={`tabular font-sans text-[24px] font-semibold tracking-[-0.02em] leading-none @[620px]:text-[28px] ${ink}`}
      >
        {count}
      </span>
      <span className="hidden truncate text-micro text-faint @[620px]:block">
        {TILE[kind].hint}
      </span>
    </button>
  );
}

function ZonePill({ entry }: { entry: VaultEntry }) {
  return entry.item.zone === "agent" ? (
    <Pill tone="violet" icon={SparkleIcon}>
      Confié à l'agent
    </Pill>
  ) : (
    <Pill tone="accent" icon={ShieldCheckIcon}>
      Protégé par toi
    </Pill>
  );
}

/** What an alert means, for this entry, in its zone: who can act, and what happens next. */
/** What else is wrong with the same entry, after the worst. */
const ALSO: Partial<Record<Kind, string>> = {
  weak: "Il est aussi trop faible.",
  old: "Il n'a pas changé depuis plus d'un an.",
};

function explain(alert: Alert, waiting: boolean): string {
  const entry = alert.entries[0];
  const agent = entry?.item.zone === "agent";
  const record = alert.records[0];
  switch (alert.kind) {
    case "pwned_password":
      return agent
        ? waiting
          ? "Ce mot de passe est apparu dans une fuite connue. L'agent a préparé une rotation, elle attend ton accord."
          : "Ce mot de passe est apparu dans une fuite connue. L'agent peut le changer pour toi."
        : "Ce mot de passe est apparu dans une fuite connue. Il est dans ta zone : l'agent ne peut pas le changer, c'est à toi de jouer.";
    case "reused": {
      const n = alert.entries.length || alert.records.length;
      const agents = alert.entries.filter((e) => e.item.zone === "agent").length;
      const base = `${plural(n, "compte partage", "comptes partagent")} le même mot de passe : s'il fuit, tous tombent.`;
      if (agents === n && n > 0) return `${base} Ils sont tous confiés à l'agent.`;
      if (agents > 0)
        return `${base} L'agent peut changer ceux qu'on lui a confiés, les autres sont à toi.`;
      return `${base} Donne un mot de passe différent à chacun.`;
    }
    case "weak":
      return agent
        ? "Trop court ou trop simple : il tomberait vite face à un dictionnaire. L'agent peut le remplacer."
        : "Trop court ou trop simple : il tomberait vite face à un dictionnaire. Remplace-le par un mot de passe généré.";
    case "old":
      return agent
        ? "Pas changé depuis plus d'un an. Une rotation régulière règle ça pour de bon."
        : "Pas changé depuis plus d'un an. Rien d'urgent, mais c'est le bon moment.";
    case "email_breach": {
      const where =
        typeof record?.details.breach === "string" ? ` « ${record.details.breach} »` : "";
      const when =
        typeof record?.details.date === "string"
          ? ` (${new Date(record.details.date).toLocaleDateString("fr-FR", { month: "long", year: "numeric" })})`
          : "";
      return `Cette adresse figure dans la fuite${where}${when}. Change le mot de passe du site concerné, et partout où tu l'utilisais.`;
    }
  }
}

function AlertCard({
  alert,
  waiting,
  offline,
  onDismiss,
}: {
  alert: Alert;
  waiting: boolean;
  offline: boolean;
  onDismiss: () => void;
}) {
  const shell = useShell();
  const label = BREACH_LABELS[alert.kind];
  const tone: Tone = label?.tone ?? "warn";
  const entry = alert.entries[0];
  const record = alert.records[0];
  const email = typeof record?.details.email === "string" ? record.details.email : null;
  const title =
    alert.kind === "reused"
      ? alert.entries.length > 1
        ? `Un mot de passe pour ${plural(alert.entries.length, "compte", "comptes")}`
        : "Mot de passe réutilisé"
      : alert.kind === "email_breach"
        ? (email ?? "Adresse surveillée")
        : (entry?.entry.name ?? "Entrée supprimée");
  const agent = entry?.item.zone === "agent";
  const primaryLabel =
    alert.kind === "email_breach"
      ? "Chercher le compte"
      : waiting
        ? "Voir la proposition"
        : agent && alert.kind !== "reused"
          ? "Demander une rotation"
          : "Générer un remplaçant";
  const primary = () => {
    if (alert.kind === "email_breach") {
      shell.openPalette(typeof record?.details.breach === "string" ? record.details.breach : "");
    } else if (waiting) shell.go("agent");
    else if (agent && alert.kind !== "reused") shell.openEntry(entry.item.id);
    else shell.openGenerator();
  };
  const urgent = alert.kind === "pwned_password" || waiting;

  return (
    <Card padded={false} className="relative">
      <span
        aria-hidden="true"
        className={`absolute bottom-4 left-0 top-4 w-[3px] rounded-r-full ${BAR[tone]}`}
      />
      <div className="flex gap-3.5 p-4 pl-5 @[620px]:p-5 @[620px]:pl-6">
        {alert.kind === "email_breach" ? (
          <Chip icon={EnvelopeSimpleIcon} tone={tone} duotone size={44} />
        ) : alert.entries.length > 1 ? (
          <span className="flex shrink-0 -space-x-3 self-start">
            {alert.entries.slice(0, 3).map((e) => (
              <Monogram
                key={e.item.id}
                name={e.entry.name}
                size={40}
                className="ring-2 ring-[var(--color-panel)]"
              />
            ))}
          </span>
        ) : (
          <Monogram name={entry?.entry.name ?? "?"} size={44} className="self-start" />
        )}
        <div className="flex min-w-0 flex-1 flex-col gap-1.5">
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
            <span className="min-w-0 truncate text-heading">{title}</span>
            {alert.kinds.map((k) => (
              <Pill key={k} tone={BREACH_LABELS[k]?.tone ?? "warn"} icon={ICONS[k]}>
                {TAGS[k]}
              </Pill>
            ))}
            {entry && alert.entries.length === 1 ? <ZonePill entry={entry} /> : null}
            {record?.source === "agent" || record?.source === "hibp" ? (
              <Pill tone="violet">Vu par l'agent</Pill>
            ) : null}
          </div>
          <p className="m-0 text-body text-muted">
            {explain(alert, waiting)}
            {alert.kinds
              .slice(1)
              .map((k) => ALSO[k])
              .filter(Boolean)
              .map((t) => ` ${t ?? ""}`)
              .join("")}
          </p>

          {alert.entries.length > 1 ? (
            <div className="mt-1 flex flex-wrap gap-1.5">
              {alert.entries.map((e) => (
                <button
                  key={e.item.id}
                  type="button"
                  onClick={() => {
                    shell.openEntry(e.item.id);
                  }}
                  className="inline-flex h-8 items-center gap-2 rounded-[9px] border border-line bg-hover pl-1 pr-2.5 text-caption font-medium transition-colors hover:border-line-strong hover:bg-press [@media(pointer:coarse)]:h-10"
                >
                  <Monogram name={e.entry.name} size={24} />
                  {e.entry.name}
                  {e.item.zone === "agent" ? (
                    <SparkleIcon
                      size={13}
                      className="text-violet-text"
                      aria-label="confié à l'agent"
                    />
                  ) : (
                    <ShieldCheckIcon
                      size={13}
                      className="text-accent-text"
                      aria-label="protégé par toi"
                    />
                  )}
                </button>
              ))}
            </div>
          ) : null}

          <div className="mt-2 flex flex-wrap items-center gap-2">
            <Button
              size="sm"
              variant={urgent ? "primary" : "secondary"}
              icon={
                alert.kind === "email_breach"
                  ? MagnifyingGlassIcon
                  : waiting
                    ? ArrowRightIcon
                    : agent && alert.kind !== "reused"
                      ? SparkleIcon
                      : KeyIcon
              }
              onClick={primary}
            >
              {primaryLabel}
            </Button>
            {entry && alert.entries.length === 1 ? (
              <Button
                size="sm"
                variant="ghost"
                onClick={() => {
                  shell.openEntry(entry.item.id);
                }}
              >
                {agent ? "Changer moi-même" : "Ouvrir la fiche"}
              </Button>
            ) : null}
            <Button size="sm" variant="ghost" disabled={offline} onClick={onDismiss}>
              Mettre de côté
            </Button>
          </div>
        </div>
      </div>
    </Card>
  );
}

function AllWell({
  checked,
  scanning,
  offline,
  onScan,
  onWatch,
}: {
  checked: string;
  scanning: boolean;
  offline: boolean;
  onScan: () => void;
  onWatch: () => void;
}) {
  return (
    <Card className="flex flex-col items-center gap-3 !py-10 text-center">
      <span className="glass relative mb-1 grid h-16 w-16 place-items-center rounded-[20px] text-ok">
        <span
          aria-hidden="true"
          className="absolute inset-0 rounded-[20px] bg-ok-soft blur-[14px]"
        />
        <SealCheckIcon size={30} weight="duotone" aria-hidden="true" className="relative" />
      </span>
      <p className="m-0 font-display text-[22px] font-bold tracking-[-0.01em]">Rien à signaler</p>
      <p className="m-0 max-w-[46ch] text-body text-muted">
        Aucun mot de passe dans une fuite connue, aucun réutilisé, aucun trop faible ni trop ancien.
      </p>
      <p className="m-0 max-w-[46ch] text-caption text-faint">
        {checked} La veille repasse d'elle-même, tu seras prévenu dès qu'une fuite sort.
      </p>
      <div className="mt-2 flex flex-wrap justify-center gap-2">
        <Button
          variant="secondary"
          icon={ArrowsClockwiseIcon}
          disabled={scanning || offline}
          onClick={onScan}
        >
          Vérifier maintenant
        </Button>
        <Button variant="ghost" icon={AtIcon} onClick={onWatch}>
          Surveiller une adresse
        </Button>
      </div>
    </Card>
  );
}

/** k-anonymity, shown rather than told: the five characters that leave, the rest that stays. */
function HowItWorks() {
  const steps = [
    <>Ton appareil calcule l'empreinte SHA-1 de chaque mot de passe.</>,
    <>
      Il n'envoie que <b className="font-semibold text-text">les 5 premiers caractères</b> à Pwned
      Passwords, qui renvoie des centaines de suffixes possibles.
    </>,
    <>
      La comparaison se fait ici.{" "}
      <b className="font-semibold text-text">Ton mot de passe ne sort jamais</b>, même haché.
    </>,
  ];
  return (
    <Card className="flex flex-col gap-3.5">
      <p className="m-0 text-heading">Comment la veille vérifie</p>
      <ol className="m-0 flex list-none flex-col gap-3 p-0">
        {steps.map((step, i) => (
          <li key={i} className="flex gap-3 text-caption text-muted">
            <span
              aria-hidden="true"
              className="tabular grid h-[22px] w-[22px] shrink-0 place-items-center rounded-[7px] border border-line-strong bg-hover font-mono text-[11px] text-faint"
            >
              {i + 1}
            </span>
            <span>{step}</span>
          </li>
        ))}
      </ol>
      <div className="rounded-[11px] border border-line bg-hover px-3 py-2.5">
        <p className="m-0 break-all font-mono text-[12px] leading-relaxed tracking-[0.02em]">
          <span className="rounded-[4px] bg-accent-soft px-0.5 font-semibold text-accent-text">
            {EXAMPLE_HASH.slice(0, 5)}
          </span>
          <span className="text-faint">{EXAMPLE_HASH.slice(5)}</span>
        </p>
        <p className="m-0 mt-1.5 text-micro text-faint">
          Exemple : seul le début en couleur quitte ton appareil.
        </p>
      </div>
    </Card>
  );
}

function WatchedEmails({
  data,
  breaches,
  onManage,
}: {
  data: Emails | undefined;
  breaches: readonly BreachRecord[];
  onManage: () => void;
}) {
  const list = data?.emails ?? [];
  const hits = (email: string) =>
    breaches.filter((b) => b.kind === "email_breach" && b.details.email === email).length;
  return (
    <Card className="flex flex-col gap-3">
      <div className="flex items-center justify-between gap-2">
        <p className="m-0 text-heading">Adresses surveillées</p>
        <Button variant="link" onClick={onManage}>
          Gérer
        </Button>
      </div>
      <p className="m-0 text-caption text-muted">
        L'agent cherche aussi ces adresses dans les fuites publiées.
      </p>
      {data && !data.enabled ? (
        <p className="m-0 flex items-start gap-2 text-caption text-faint">
          <WarningIcon size={15} className="mt-px shrink-0" aria-hidden="true" />
          Pas de clé Have I Been Pwned sur ce serveur : cette veille est en pause.
        </p>
      ) : null}
      {list.length === 0 ? (
        <Button variant="secondary" size="sm" icon={AtIcon} onClick={onManage}>
          Ajouter une adresse
        </Button>
      ) : (
        <ul className="m-0 flex list-none flex-col gap-2 p-0">
          {list.map((e) => {
            const n = hits(e.email);
            return (
              <li key={e.id} className="flex items-center gap-2.5 text-caption">
                <EnvelopeSimpleIcon size={15} className="shrink-0 text-faint" aria-hidden="true" />
                <span className="min-w-0 flex-1 truncate font-medium">{e.email}</span>
                {n ? (
                  <Pill tone="warn">{plural(n, "fuite", "fuites")}</Pill>
                ) : (
                  <Pill tone="ok">Aucune</Pill>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </Card>
  );
}
