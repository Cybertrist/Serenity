import {
  CaretRightIcon,
  CloudSlashIcon,
  MagnifyingGlassIcon,
  PlusIcon,
  ShieldCheckIcon,
  ShieldWarningIcon,
  VaultIcon,
  XIcon,
} from "@phosphor-icons/react";
import { motion } from "motion/react";
import { useMemo, useState } from "react";
import { useBreaches, usePolicies, useRotations } from "../../app/hooks/queries";
import { useEntries, type VaultEntry } from "../../app/hooks/useEntries";
import { useSession } from "../../app/session";
import {
  Button,
  Card,
  Chip,
  EmptyState,
  Field,
  IconButton,
  Row,
  SectionTitle,
  stagger,
} from "../../design";
import { Header } from "../../app/shell/Header";
import { useShell } from "../../app/shell/context";
import { daysUntil, plural } from "../../lib/format";
import { EntryEditor } from "./EntryEditor";
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
  return (
    <Card padded={false}>
      {entries.map((e, i) => {
        const chip = zoneChip(e.item.zone);
        return (
          <motion.div
            key={e.item.id}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={stagger(i)}
          >
            <Row
              first={i === 0}
              chip={<Chip icon={chip.icon} tone={chip.tone} />}
              title={e.entry.name}
              caption={e.entry.username || e.domain || " "}
              trailing={trailing(e)}
              onClick={() => {
                onOpen(e);
              }}
            />
          </motion.div>
        );
      })}
    </Card>
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
  const [searching, setSearching] = useState(false);
  const shell = useShell();
  const [adding, setAdding] = useState(false);

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
      return <span className="text-caption text-accent">à valider</span>;
    }
    const due = daysUntil(policies.data?.find((p) => p.item_id === e.item.id)?.next_due_at);
    if (due !== null)
      return (
        <span className="whitespace-nowrap text-caption text-muted">
          {due <= 0 ? "due" : `dans ${String(due)} j`}
        </span>
      );
    return <CaretRightIcon size={20} className="text-muted" aria-hidden="true" />;
  };

  return (
    <>
      <Header
        title="Coffre"
        actions={
          <IconButton
            icon={MagnifyingGlassIcon}
            label="Rechercher"
            onClick={() => {
              setSearching(true);
            }}
          />
        }
      />
      <div className="flex flex-col gap-4 px-4 pb-6">
        {session.offline ? (
          <Card className="flex items-center gap-3">
            <Chip icon={CloudSlashIcon} tone="warn" />
            <span className="text-body">Hors ligne : lecture seule.</span>
          </Card>
        ) : null}
        {searching ? (
          <Field
            label="Rechercher"
            value={query}
            autoFocus
            onChange={(e) => {
              setQuery(e.target.value);
            }}
            trailing={
              <IconButton
                icon={XIcon}
                label="Fermer la recherche"
                onClick={() => {
                  setQuery("");
                  setSearching(false);
                }}
              />
            }
          />
        ) : null}
        {/* Offline, alerts cannot be checked: no "all is well" that could be wrong. */}
        {!searching && !session.offline && entries.length > 0 ? (
          <Card className="flex items-center gap-3">
            {watched.size === 0 ? (
              <Chip icon={ShieldCheckIcon} tone="ok" duotone />
            ) : (
              <Chip icon={ShieldWarningIcon} tone="warn" duotone />
            )}
            <span className="flex flex-col">
              <span className="text-body font-semibold">
                {watched.size === 0
                  ? "Tout va bien."
                  : `${plural(watched.size, "compte", "comptes")} à surveiller`}
              </span>
              <span className="text-caption text-muted">
                {plural(entries.length, "entrée", "entrées")} ·{" "}
                {delegatedLabel(entries.filter((e) => e.item.zone === "agent").length)}
              </span>
            </span>
          </Card>
        ) : null}

        {entries.length === 0 ? (
          <EmptyState
            icon={VaultIcon}
            text="Ton coffre est vide."
            action={
              <Button
                icon={PlusIcon}
                onClick={() => {
                  setAdding(true);
                }}
              >
                Ajouter une entrée
              </Button>
            }
          />
        ) : (
          <>
            <SectionTitle
              title="Protégé par toi"
              subtitle="Seul ton appareil peut lire ces comptes."
            />
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
              <p className="m-0 px-1 text-caption text-muted">Aucune entrée ici.</p>
            )}
            <SectionTitle
              title="Confié à l'agent"
              subtitle="L'agent les surveille et prévoit leurs rotations."
            />
            {agent.length ? (
              <EntryList
                entries={agent}
                onOpen={(e) => {
                  shell.openEntry(e.item.id);
                }}
                trailing={agentTrailing}
              />
            ) : (
              <p className="m-0 px-1 text-caption text-muted">
                Rien de confié pour l'instant. Ouvre une entrée pour la confier.
              </p>
            )}
          </>
        )}
      </div>
      {entries.length > 0 && !session.offline ? (
        <button
          type="button"
          aria-label="Ajouter une entrée"
          onClick={() => {
            setAdding(true);
          }}
          className="fixed bottom-[108px] right-[max(20px,calc(50vw-220px))] z-20 flex h-14 w-14 items-center justify-center rounded-[18px] bg-accent text-on-accent"
        >
          <PlusIcon size={24} aria-hidden="true" />
        </button>
      ) : null}
      {adding ? (
        <EntryEditor
          open
          onClose={() => {
            setAdding(false);
          }}
        />
      ) : null}
    </>
  );
}
