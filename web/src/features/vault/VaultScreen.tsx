import {
  CaretRightIcon,
  CloudSlashIcon,
  MagnifyingGlassIcon,
  PlusIcon,
  QuestionIcon,
  RobotIcon,
  ShieldCheckIcon,
  ShieldWarningIcon,
  VaultIcon,
} from "@phosphor-icons/react";
import { motion } from "motion/react";
import { useMemo, useState } from "react";
import { useBreaches, usePolicies, useRotations } from "../../app/hooks/queries";
import { useEntries, type VaultEntry } from "../../app/hooks/useEntries";
import { useSession } from "../../app/session";
import { Button, Card, Chip, EmptyState, LIST, LIST_ITEM, Note, Pill, Row } from "../../design";
import { Header } from "../../app/shell/Header";
import { useShell } from "../../app/shell/context";
import { daysUntil, plural } from "../../lib/format";
import { EntryMark } from "./EntryMark";
import { useIcons } from "./icons";
import { zoneChip } from "./zone";

function EntryList({
  entries,
  onOpen,
  trailing,
}: {
  entries: VaultEntry[];
  onOpen: (e: VaultEntry) => void;
  trailing: (e: VaultEntry) => React.ReactNode;
}) {
  const icons = useIcons();
  return (
    <Card padded={false}>
      <motion.div variants={LIST} initial="initial" animate="animate">
        {entries.map((e, i) => (
          <motion.div key={e.item.id} variants={LIST_ITEM}>
            <Row
              first={i === 0}
              chip={<EntryMark name={e.entry.name} domain={e.domain} icon={icons.get(e.item.id)} />}
              title={e.entry.name}
              caption={e.entry.username || e.domain || "sans identifiant"}
              trailing={trailing(e)}
              onClick={() => {
                onOpen(e);
              }}
            />
          </motion.div>
        ))}
      </motion.div>
    </Card>
  );
}

/**
 * A zone and, in one sentence, who can read it. Both are always shown: it is the model, and
 * the header carries the same mark as its entries, so the glyph is its own legend.
 */
function Zone({
  zone,
  title,
  explanation,
  count,
  children,
}: {
  zone: "personal" | "agent";
  title: string;
  explanation: string;
  count: number;
  children: React.ReactNode;
}) {
  const chip = zoneChip(zone);
  return (
    <section className="flex flex-col gap-3">
      <div className="flex flex-col gap-1 px-1">
        <div className="flex items-center gap-2">
          <Chip icon={chip.icon} tone={chip.tone} size={26} />
          <h2 className="m-0 text-body font-semibold">{title}</h2>
          <Pill tone="neutral">{String(count)}</Pill>
        </div>
        <p className="m-0 text-caption text-muted">{explanation}</p>
      </div>
      {children}
    </section>
  );
}

function delegatedLabel(count: number): string {
  return count === 0
    ? "aucune confiée à l'agent"
    : `${plural(count, "confiée", "confiées")} à l'agent`;
}

export function VaultScreen() {
  const session = useSession();
  const { entries } = useEntries();
  const breaches = useBreaches();
  const policies = usePolicies();
  const rotations = useRotations();
  const [query, setQuery] = useState("");
  const shell = useShell();

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return entries;
    return entries.filter((e) =>
      [e.entry.name, e.entry.username ?? "", e.domain ?? ""].some((v) =>
        v.toLowerCase().includes(q),
      ),
    );
  }, [entries, query]);
  const personal = filtered.filter((e) => e.item.zone === "personal");
  const agent = filtered.filter((e) => e.item.zone === "agent");
  const watched = new Set((breaches.data ?? []).map((b) => b.item_id).filter(Boolean));

  const agentTrailing = (e: VaultEntry) => {
    if (rotations.data?.some((r) => r.item_id === e.item.id && r.status === "scheduled")) {
      return <Pill tone="accent">à valider</Pill>;
    }
    const due = daysUntil(policies.data?.find((p) => p.item_id === e.item.id)?.next_due_at);
    if (due !== null)
      return (
        <span className="whitespace-nowrap text-caption text-muted">
          {due <= 0 ? "rotation due" : `dans ${String(due)} j`}
        </span>
      );
    return <CaretRightIcon size={20} className="text-muted" aria-hidden="true" />;
  };

  return (
    <>
      <Header title="Coffre" subtitle="Tes comptes, dans leurs deux zones." />
      <div className="flex flex-col gap-5 pb-6">
        {session.offline ? (
          <Note tone="warn" icon={CloudSlashIcon}>
            Hors ligne : tu peux lire ton coffre, mais rien n'y est modifiable tant que le serveur
            n'est pas joignable.
          </Note>
        ) : null}

        {entries.length > 0 ? (
          <div className="relative mx-auto w-full max-w-[420px]">
            <MagnifyingGlassIcon
              size={18}
              aria-hidden="true"
              className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-muted"
            />
            <input
              type="search"
              aria-label="Rechercher une entrée"
              placeholder="Rechercher"
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
              }}
              className="h-11 w-full rounded-control border border-line bg-raised pl-10 pr-4 text-body outline-none placeholder:text-muted focus-visible:border-accent"
            />
          </div>
        ) : null}

        {/* Offline, alerts cannot be checked: no "all is well" that could be wrong. */}
        {!session.offline && entries.length > 0 && !query ? (
          <Card className="mx-auto flex w-full max-w-[520px] items-center gap-3.5">
            <motion.span
              animate={watched.size === 0 ? { scale: [1, 1.05, 1] } : { scale: 1 }}
              transition={{ duration: 3.2, repeat: Infinity, ease: "easeInOut" }}
            >
              <Chip
                icon={watched.size === 0 ? ShieldCheckIcon : ShieldWarningIcon}
                tone={watched.size === 0 ? "ok" : "warn"}
                duotone
                size={44}
              />
            </motion.span>
            <span className="flex min-w-0 flex-1 flex-col">
              <span className="text-body font-semibold">
                {watched.size === 0
                  ? "Tout va bien."
                  : `${plural(watched.size, "compte", "comptes")} à surveiller`}
              </span>
              <span className="text-caption text-muted">
                {plural(entries.length, "entrée", "entrées")} · {delegatedLabel(agent.length)}
              </span>
            </span>
            {watched.size > 0 ? (
              <Button
                variant="secondary"
                onClick={() => {
                  shell.go("breaches");
                }}
              >
                Voir
              </Button>
            ) : null}
          </Card>
        ) : null}

        {entries.length === 0 ? (
          <EmptyState
            icon={VaultIcon}
            title="Ton coffre est vide."
            text="Ajoute un compte, ou importe ton export Bitwarden depuis les réglages. Tout arrive d'abord dans ta zone personnelle."
            action={
              <div className="flex flex-col gap-2 sm:flex-row">
                <Button icon={PlusIcon} disabled={session.offline} onClick={shell.addEntry}>
                  Ajouter une entrée
                </Button>
                <Button variant="secondary" icon={QuestionIcon} onClick={shell.openGuide}>
                  Comment ça marche ?
                </Button>
              </div>
            }
          />
        ) : filtered.length === 0 ? (
          <EmptyState
            icon={MagnifyingGlassIcon}
            title="Aucun résultat."
            text={`Rien ne correspond à « ${query} ».`}
          />
        ) : (
          <div className="grid gap-5 @[620px]:grid-cols-2 @[620px]:items-start">
            <Zone
              zone="personal"
              title="Protégé par toi"
              explanation="Chiffré par ton mot de passe maître. Ni le serveur ni l'agent ne peut le lire."
              count={personal.length}
            >
              {personal.length ? (
                <EntryList
                  entries={personal}
                  onOpen={(e) => {
                    shell.openEntry(e.item.id);
                  }}
                  trailing={() => (
                    <CaretRightIcon size={20} className="text-muted" aria-hidden="true" />
                  )}
                />
              ) : (
                <EmptyState
                  icon={ShieldCheckIcon}
                  title="Rien dans cette zone."
                  text="Toute nouvelle entrée arrive ici par défaut."
                />
              )}
            </Zone>
            <Zone
              zone="agent"
              title="Confié à l'agent"
              explanation="Le serveur peut les déchiffrer pour les surveiller et changer leur mot de passe."
              count={agent.length}
            >
              {agent.length ? (
                <EntryList
                  entries={agent}
                  onOpen={(e) => {
                    shell.openEntry(e.item.id);
                  }}
                  trailing={agentTrailing}
                />
              ) : (
                <EmptyState
                  icon={RobotIcon}
                  title="Rien de confié."
                  text="Ouvre une entrée, puis « Confier à l'agent » : c'est toujours ton choix, entrée par entrée."
                />
              )}
            </Zone>
          </div>
        )}
      </div>
    </>
  );
}
