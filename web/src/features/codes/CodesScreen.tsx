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
import { Button, Card, EmptyState, LIST, LIST_ITEM, Note, SearchField } from "../../design";
import { plural } from "../../lib/format";
import { EntryMark } from "../vault/EntryMark";
import { TotpCode } from "../vault/TotpCode";
import { zoneChip } from "../vault/zone";

/**
 * One row per code. It is not a `<Row>`: the code carries its own copy button, and a button
 * cannot live inside a button. The name keeps its own hit area, which opens the entry.
 */
function CodeRow({
  entry,
  first,
  onOpen,
}: {
  entry: VaultEntry;
  first: boolean;
  onOpen: () => void;
}) {
  const chip = zoneChip(entry.item.zone);
  return (
    <div className="flex w-full items-center gap-3.5 pl-4 pr-2">
      <EntryMark name={entry.entry.name} zone={entry.item.zone} badge />
      <div
        className={`flex min-h-[68px] min-w-0 flex-1 flex-wrap items-center justify-between gap-x-3 py-2 ${first ? "" : "border-t border-line"}`}
      >
        <button
          type="button"
          onClick={onOpen}
          title="Ouvrir la fiche"
          className="-mx-2 flex min-w-0 max-w-full flex-col rounded-control px-2 py-1 text-left transition-colors duration-150 hover:bg-hover"
        >
          <span className="truncate text-body font-medium">{entry.entry.name}</span>
          <span className="truncate text-caption text-muted">
            {entry.entry.username || entry.domain || chip.label}
          </span>
        </button>
        <TotpCode value={entry.entry.totp ?? ""} />
      </div>
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
      <div className="flex flex-col gap-5 pb-6">
        {coded.length > 0 ? (
          <div className="@[620px]:max-w-[420px]">
            <SearchField label="Rechercher un code" value={query} onChange={setQuery} />
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
            <motion.ul
              variants={LIST}
              initial="initial"
              animate="animate"
              className="m-0 list-none p-0"
            >
              {filtered.map((e, i) => (
                <motion.li key={e.item.id} variants={LIST_ITEM}>
                  <CodeRow
                    entry={e}
                    first={i === 0}
                    onOpen={() => {
                      openEntry(e.item.id);
                    }}
                  />
                </motion.li>
              ))}
            </motion.ul>
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
