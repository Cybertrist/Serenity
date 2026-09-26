import {
  CaretRightIcon,
  CloudSlashIcon,
  LockKeyIcon,
  WarningIcon,
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
import {
  Button,
  Card,
  Count,
  EmptyState,
  LIST,
  LIST_ITEM,
  Note,
  Pill,
  Row,
  SearchField,
  StatusCard,
} from "../../design";
import { Header } from "../../app/shell/Header";
import { useShell } from "../../app/shell/context";
import { daysUntil, plural } from "../../lib/format";
import { EntryMark } from "./EntryMark";
import { zoneChip } from "./zone";

function Caret() {
  return <CaretRightIcon size={18} className="shrink-0 text-muted" aria-hidden="true" />;
}

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
      <motion.ul variants={LIST} initial="initial" animate="animate" className="m-0 list-none p-0">
        {entries.map((e, i) => (
          <motion.li key={e.item.id} variants={LIST_ITEM}>
            <Row
              first={i === 0}
              chip={<EntryMark name={e.entry.name} zone={e.item.zone} />}
              title={e.entry.name}
              caption={e.entry.username || e.domain || "sans identifiant"}
              trailing={trailing(e)}
              onClick={() => {
                onOpen(e);
              }}
            />
          </motion.li>
        ))}
      </motion.ul>
    </Card>
  );
}

/**
 * A zone and, in one sentence, who can read it. Both are always shown: it is the model. The
 * glyph of the zone sits in the heading, once, rather than on every entry.
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
  const Glyph = chip.icon;
  return (
    <section className="flex flex-col gap-3" aria-label={title}>
      <div className="flex flex-col gap-1 px-1">
        <div className="flex items-center gap-2">
          <Glyph
            size={18}
            weight="fill"
            aria-hidden="true"
            className={chip.tone === "accent" ? "text-accent" : "text-ok"}
          />
          <h2 className="m-0 text-heading">{title}</h2>
          <Count value={count} />
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
  const { entries, unreadable } = useEntries();
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
        <span className="tabular whitespace-nowrap text-caption text-muted">
          {due <= 0 ? "rotation due" : `dans ${String(due)} j`}
        </span>
      );
    return <Caret />;
  };

  /*
   * Where things stand. Offline, or while the alerts have not answered, nothing reassuring is
   * said: "all is well" is a claim, and the app only makes it when it knows.
   */
  const status = () => {
    if (session.offline || entries.length === 0 || query) return null;
    const summary = `${plural(entries.length, "entrée", "entrées")} · ${delegatedLabel(agent.length)}`;
    if (breaches.isPending) return null;
    if (breaches.isError)
      return (
        <StatusCard
          icon={ShieldWarningIcon}
          tone="neutral"
          title="Alertes indisponibles"
          text="La veille n'a pas répondu. Réessaie dans un instant."
        />
      );
    return watched.size === 0 ? (
      <StatusCard icon={ShieldCheckIcon} tone="ok" title="Tout va bien" text={summary} />
    ) : (
      <StatusCard
        icon={ShieldWarningIcon}
        tone="warn"
        title={`${plural(watched.size, "compte", "comptes")} à surveiller`}
        text={summary}
        action={
          <Button
            variant="secondary"
            onClick={() => {
              shell.go("breaches");
            }}
          >
            Voir
          </Button>
        }
      />
    );
  };

  return (
    <>
      <Header title="Coffre" subtitle="Tes comptes, rangés dans leurs deux zones." />
      <div className="flex flex-col gap-6 pb-6">
        {session.offline && session.needsUnlock ? (
          <div className="flex flex-col gap-3 rounded-control bg-accent-soft px-4 py-3 @[620px]:flex-row @[620px]:items-center">
            <p className="m-0 flex flex-1 items-start gap-2.5 text-caption text-accent">
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

        {entries.length > 0 ? (
          <div className="@[620px]:max-w-[420px]">
            <SearchField label="Rechercher une entrée" value={query} onChange={setQuery} />
          </div>
        ) : null}

        {status()}

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
          <div className="grid gap-8 @[760px]:grid-cols-2 @[760px]:items-start @[760px]:gap-6">
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
                  trailing={() => <Caret />}
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
                  text="Ouvre une entrée, puis « Confier à l'agent ». C'est toujours ton choix, entrée par entrée."
                />
              )}
            </Zone>
          </div>
        )}
      </div>
    </>
  );
}
