import {
  ArrowSquareOutIcon,
  CheckIcon,
  CopyIcon,
  MagnifyingGlassIcon,
  PasswordIcon,
  QrCodeIcon,
  VaultIcon,
} from "@phosphor-icons/react";
import { motion } from "motion/react";
import { useMemo, useRef, useState } from "react";
import { copySecret } from "../../app/clipboard";
import { useEntries, type VaultEntry } from "../../app/hooks/useEntries";
import { Header } from "../../app/shell/Header";
import { useShell } from "../../app/shell/context";
import { useShortcut } from "../../app/shortcuts";
import { useToast } from "../../app/toast";
import {
  Button,
  EmptyState,
  IconButton,
  LIST,
  LIST_ITEM,
  Monogram,
  Pill,
  SearchField,
} from "../../design";
import { currentCode } from "../../lib/totp";
import { plural } from "../../lib/format";
import { errorText } from "../account/screens/wording";
import { SecondsRing, spaced, useTotp, useWindowSeconds } from "../vault/TotpCode";
import { zoneChip } from "../vault/zone";

/** Copies the code of an entry as it is right now, computed again at the moment of the click. */
function useCopyCode() {
  const toast = useToast();
  const [copied, setCopied] = useState<string | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const copy = (entry: VaultEntry) => {
    currentCode(entry.entry.totp ?? "")
      .then((s) => copySecret(s.code))
      .then(
        () => {
          toast(`Code de ${entry.entry.name} copié. Effacé dans 30 s.`);
          setCopied(entry.item.id);
          if (timer.current) clearTimeout(timer.current);
          timer.current = setTimeout(() => {
            setCopied(null);
          }, 1600);
        },
        (e: unknown) => {
          toast(errorText(e), "crit");
        },
      );
  };
  return { copy, copied };
}

/**
 * One code, big enough to read across the room. The whole tile is the copy button (a click, or
 * Enter once it has the focus); the fiche keeps its own small button in the corner, above it.
 */
function CodeTile({
  entry,
  copied,
  onCopy,
  onOpen,
}: {
  entry: VaultEntry;
  copied: boolean;
  onCopy: () => void;
  onOpen: () => void;
}) {
  const { state, invalid } = useTotp(entry.entry.totp ?? "");
  const zone = zoneChip(entry.item.zone);
  const low = state !== null && state.remaining <= 5;
  return (
    <div className="glass group relative flex flex-col gap-4 rounded-card p-4 transition-[transform,border-color] duration-200 hover:-translate-y-0.5 hover:border-line-strong motion-reduce:hover:translate-y-0 @[620px]:p-[18px]">
      {/* The hit area of the tile. Its name says what it does, for a screen reader too. */}
      <button
        type="button"
        onClick={onCopy}
        disabled={invalid || !state}
        aria-label={`Copier le code de ${entry.entry.name}`}
        className="absolute inset-0 z-0 rounded-card focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
      />
      <div className="pointer-events-none relative flex items-center gap-3">
        <Monogram name={entry.entry.name} size={36} />
        <span className="flex min-w-0 flex-1 flex-col">
          <b className="truncate text-[14px] font-medium leading-tight">{entry.entry.name}</b>
          <small className="truncate text-[12px] text-faint">
            {entry.entry.username || entry.domain || zone.label}
          </small>
        </span>
      </div>
      <IconButton
        icon={ArrowSquareOutIcon}
        label={`Ouvrir la fiche de ${entry.entry.name}`}
        onClick={onOpen}
        className="!absolute right-2.5 top-3 z-[1]"
      />
      <div className="pointer-events-none relative flex items-center justify-between gap-3">
        {invalid ? (
          <span className="text-caption text-crit">Clé TOTP illisible</span>
        ) : (
          <span
            className={`tabular whitespace-nowrap font-mono text-[32px] font-medium leading-none tracking-[0.06em] transition-colors duration-300 ${
              state ? (low ? "text-warn-text" : "text-text") : "text-faint"
            }`}
          >
            {state ? spaced(state.code) : "··· ···"}
          </span>
        )}
        {state ? (
          <span className="flex items-center gap-2">
            <span
              className={`grid h-8 w-8 place-items-center rounded-[9px] transition-colors duration-200 ${
                copied
                  ? "bg-ok-soft text-ok"
                  : "text-faint group-hover:bg-hover group-hover:text-text"
              }`}
              aria-hidden="true"
            >
              {copied ? <CheckIcon size={17} weight="bold" /> : <CopyIcon size={17} />}
            </span>
            <SecondsRing remaining={state.remaining} period={state.period} size={26} />
          </span>
        ) : null}
      </div>
      <div className="pointer-events-none relative flex items-center justify-between gap-2 border-t border-line pt-3 text-[12px] text-faint">
        <Pill tone={zone.pill} icon={zone.icon}>
          {zone.label}
        </Pill>
        <span className="truncate text-right">
          {entry.item.zone === "agent" ? "Le serveur peut aussi le calculer" : "Seulement ici"}
        </span>
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
  const { openEntry, go, openSettings, form } = useShell();
  const [query, setQuery] = useState("");
  const search = useRef<HTMLInputElement>(null);
  const left = useWindowSeconds();
  const { copy, copied } = useCopyCode();
  const phone = form === "mobile";

  const coded = useMemo(() => entries.filter((e) => (e.entry.totp ?? "").trim() !== ""), [entries]);
  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase();
    if (!needle) return coded;
    return coded.filter((e) =>
      [e.entry.name, e.entry.username, e.domain ?? ""].join(" ").toLowerCase().includes(needle),
    );
  }, [coded, query]);
  const delegated = coded.filter((e) => e.item.zone === "agent").length;

  useShortcut("/", () => {
    search.current?.focus();
  });

  const countdown = (
    <span className="flex items-center gap-2 text-[13px] text-muted">
      <SecondsRing remaining={left} period={30} size={20} />
      <span>
        Nouveaux codes dans <b className="tabular font-semibold text-text">{left}</b> s
      </span>
    </span>
  );

  return (
    <>
      <Header
        title="Codes 2FA"
        subtitle={
          phone
            ? "Calculés ici, même hors ligne. Touche un code pour le copier."
            : "Calculés sur cet appareil, même hors ligne. Un clic copie le code."
        }
        actions={coded.length > 0 && !phone ? countdown : undefined}
      />
      <div className="flex flex-col gap-5 pb-6">
        {coded.length === 0 ? (
          <EmptyState
            icon={PasswordIcon}
            title="Aucun code pour l'instant."
            text="Ouvre une entrée, puis colle son lien otpauth:// ou sa clé dans « Clé TOTP ». Ou importe tes comptes depuis Google Authenticator. Le code se calcule ici, jamais sur le serveur."
            action={
              <div className="flex flex-col gap-2 sm:flex-row">
                <Button
                  icon={QrCodeIcon}
                  onClick={() => {
                    openSettings("transfer");
                  }}
                >
                  Importer depuis Authenticator
                </Button>
                <Button
                  variant="secondary"
                  icon={VaultIcon}
                  onClick={() => {
                    go("vault");
                  }}
                >
                  Aller au coffre
                </Button>
              </div>
            }
          />
        ) : (
          <>
            <div className="flex flex-col gap-3 @[620px]:flex-row @[620px]:items-center @[620px]:gap-4">
              <div className="@[620px]:w-[320px]">
                <SearchField
                  label="Chercher un code"
                  placeholder="Chercher un code"
                  value={query}
                  onChange={setQuery}
                  shortcut="/"
                  inputRef={search}
                  onKeyDown={(event) => {
                    // Enter in the search copies the first code that matches.
                    const first = filtered[0];
                    if (event.key === "Enter" && first) {
                      event.preventDefault();
                      copy(first);
                    }
                  }}
                />
              </div>
              {phone ? (
                <div className="glass flex items-center rounded-[14px] px-3.5 py-3">
                  {countdown}
                </div>
              ) : (
                <span className="text-[12.5px] text-faint">
                  {plural(coded.length, "code", "codes")}
                  {delegated > 0
                    ? `, dont ${String(delegated)} que le serveur peut aussi calculer pour l'agent`
                    : ", tous calculés seulement sur tes appareils"}
                </span>
              )}
            </div>

            {filtered.length === 0 ? (
              <EmptyState
                icon={MagnifyingGlassIcon}
                title="Aucun code à ce nom."
                text={`Rien ne correspond à « ${query} ».`}
              />
            ) : (
              <motion.ul
                variants={LIST}
                initial="initial"
                animate="animate"
                className="m-0 grid list-none gap-3 p-0 @[620px]:grid-cols-2 @[620px]:gap-4 @[1180px]:grid-cols-3"
              >
                {filtered.map((e) => (
                  <motion.li key={e.item.id} variants={LIST_ITEM}>
                    <CodeTile
                      entry={e}
                      copied={copied === e.item.id}
                      onCopy={() => {
                        copy(e);
                      }}
                      onOpen={() => {
                        openEntry(e.item.id);
                      }}
                    />
                  </motion.li>
                ))}
                {query ? null : (
                  <motion.li variants={LIST_ITEM}>
                    <button
                      type="button"
                      onClick={() => {
                        openSettings("transfer");
                      }}
                      className="flex h-full min-h-[120px] w-full flex-col items-center justify-center gap-2 rounded-card border border-dashed border-line-strong text-[13.5px] text-muted transition-colors duration-150 hover:border-accent hover:bg-hover hover:text-text @[620px]:min-h-[170px]"
                    >
                      <QrCodeIcon size={22} aria-hidden="true" />
                      Importer depuis Authenticator
                    </button>
                  </motion.li>
                )}
              </motion.ul>
            )}

            {/*
              The model, said where it matters: a code in the agent zone is a code the server
              can produce too. That is what lets the agent log back in during a rotation.
            */}
            {delegated > 0 && phone ? (
              <p className="m-0 px-1 text-caption text-faint">
                {plural(delegated, "code est", "codes sont")} dans la zone agent : le serveur peut
                les calculer aussi, c'est ce qui lui permet de se reconnecter à ta place.
              </p>
            ) : null}
          </>
        )}
      </div>
    </>
  );
}
