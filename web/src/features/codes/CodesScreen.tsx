import {
  ClockCountdownIcon,
  MagnifyingGlassIcon,
  RobotIcon,
  VaultIcon,
} from "@phosphor-icons/react";
import { motion } from "motion/react";
import { useMemo, useState } from "react";
import { useEntries, type VaultEntry } from "../../app/hooks/useEntries";
import { Header } from "../../app/shell/Header";
import { useShell } from "../../app/shell/context";
import { Button, Card, EmptyState, LIST, LIST_ITEM, Note } from "../../design";
import { plural } from "../../lib/format";
import { TotpCode } from "../vault/TotpCode";
import { EntryMark } from "../vault/EntryMark";
import { useIcons } from "../vault/icons";
import { zoneChip } from "../vault/zone";

/**
 * One row per code. It is not a `<Row>`: the code carries its own copy button, and a button
 * cannot live inside a button. The name keeps its own hit area, which opens the entry.
 */
function CodeRow({
  entry,
  first,
  onOpen,
  icon,
}: {
  entry: VaultEntry;
  first: boolean;
  onOpen: () => void;
  icon?: string | undefined;
}) {
  const chip = zoneChip(entry.item.zone);
  return (
    <div
      className={`flex min-h-[60px] w-full items-center gap-3 px-4 py-2 ${first ? "" : "border-t border-line"}`}
    >
      <EntryMark name={entry.entry.name} domain={entry.domain} icon={icon} />
      <button
        type="button"
        onClick={onOpen}
        title="Ouvrir la fiche"
        className="flex min-w-0 flex-1 flex-col rounded-control py-1 text-left transition-colors duration-150 hover:bg-hover"
      >
        <span className="truncate text-body font-medium">{entry.entry.name}</span>
        <span className="truncate text-caption text-muted">
          {entry.entry.username || entry.domain || chip.label}
        </span>
      </button>
      <TotpCode value={entry.entry.totp ?? ""} />
    </div>
  );
}

/**
 * Every one-time code of the vault, on one screen. The codes are computed here, from the secret
 * held in the entry: nothing is asked to the server, and the screen works offline.
 */
export function CodesScreen() {
  const { entries } = useEntries();
  const { openEntry, go } = useShell();
  const icons = useIcons();
  const [query, setQuery] = useState("");

  const coded = useMemo(() => entries.filter((e) => (e.entry.totp ?? "").trim() !== ""), [entries]);
  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase();
    if (!needle) return coded;
    return coded.filter((e) =>
      [e.entry.name, e.entry.username, e.domain ?? ""].join(" ").toLowerCase().includes(needle),
    );
  }, [coded, query]);
  const delegated = coded.filter((e) => e.item.zone === "agent").length;

  return (
    <>
      <Header title="Codes" subtitle="Tes codes à deux facteurs, calculés sur cet appareil." />
      <div className="mx-auto flex w-full max-w-[720px] flex-col gap-4">
        {coded.length > 0 ? (
          <div className="relative mx-auto w-full max-w-[420px]">
            <MagnifyingGlassIcon
              size={18}
              aria-hidden="true"
              className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-muted"
            />
            <input
              type="search"
              aria-label="Rechercher un code"
              placeholder="Rechercher"
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
              }}
              className="h-11 w-full rounded-control border border-line bg-raised pl-10 pr-4 text-body outline-none placeholder:text-muted focus-visible:border-accent"
            />
          </div>
        ) : null}

        {coded.length === 0 ? (
          <EmptyState
            icon={ClockCountdownIcon}
            title="Aucun code pour l'instant."
            text="Ouvre une entrée, puis colle son lien otpauth:// ou sa clé dans le champ « Clé TOTP ». Le code se calcule ici, jamais sur le serveur."
            action={
              <Button
                icon={VaultIcon}
                onClick={() => {
                  go("vault");
                }}
              >
                Aller au coffre
              </Button>
            }
          />
        ) : filtered.length === 0 ? (
          <EmptyState icon={MagnifyingGlassIcon} title="Aucun code à ce nom." />
        ) : (
          <Card padded={false}>
            <motion.div variants={LIST} initial="initial" animate="animate">
              {filtered.map((e, i) => (
                <motion.div key={e.item.id} variants={LIST_ITEM}>
                  <CodeRow
                    entry={e}
                    first={i === 0}
                    icon={icons.get(e.item.id)}
                    onOpen={() => {
                      openEntry(e.item.id);
                    }}
                  />
                </motion.div>
              ))}
            </motion.div>
          </Card>
        )}

        {/*
          The model, said where it matters: a code in the agent zone is a code the server can
          produce too. That is what lets the agent log back in during a rotation.
        */}
        {delegated > 0 ? (
          <Note tone="accent" icon={RobotIcon}>
            {plural(delegated, "code est", "codes sont")} dans la zone agent : le serveur peut les
            calculer aussi, c'est ce qui lui permet de se reconnecter à ta place. Les autres ne
            quittent jamais cet appareil.
          </Note>
        ) : null}
      </div>
    </>
  );
}
