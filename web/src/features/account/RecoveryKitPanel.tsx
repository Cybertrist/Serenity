import {
  CheckCircleIcon,
  CloudSlashIcon,
  CopyIcon,
  DownloadSimpleIcon,
  EyeSlashIcon,
  KeyIcon,
  LifebuoyIcon,
  type Icon,
} from "@phosphor-icons/react";
import { useState } from "react";
import { CLEAR_AFTER_MS, copySecret } from "../../app/clipboard";
import { useToast } from "../../app/toast";
import { Button, Checkbox, ErrorNote } from "../../design";
import { errorText } from "./screens/wording";

const TODAY = () =>
  new Date().toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" });

/**
 * The kit as a sheet: who it belongs to, nine numbered groups, the day it was made, then the
 * two ways to keep it. Shown once, never stored.
 */
export function RecoveryKitPanel({ kit, username }: { kit: string; username: string }) {
  const toast = useToast();
  const download = () => {
    const text = `Serenity : kit de récupération\n\nIdentifiant : ${username}\nClé : ${kit}\nCréé le : ${TODAY()}\n\nGarde ce fichier hors ligne (papier, clé USB). Il permet, avec ton code TOTP, de retrouver ton coffre si tu oublies ton mot de passe maître.\n`;
    const url = URL.createObjectURL(new Blob([text], { type: "text/plain" }));
    const a = document.createElement("a");
    a.href = url;
    a.download = "serenity-kit-de-recuperation.txt";
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <>
      <figure
        aria-label="Kit de récupération"
        className="m-0 flex flex-col gap-3 rounded-[14px] border border-[color-mix(in_oklab,var(--color-warn)_38%,transparent)] bg-[linear-gradient(160deg,color-mix(in_oklab,var(--color-warn)_9%,var(--color-glass-2)),var(--color-glass-2)_55%)] p-3.5 shadow-[0_18px_40px_-24px_color-mix(in_oklab,var(--color-warn)_60%,transparent)]"
      >
        <figcaption className="flex items-center gap-2 px-0.5">
          <KeyIcon size={15} weight="bold" aria-hidden="true" className="text-warn-text" />
          <span className="text-[12px] font-semibold uppercase tracking-[0.08em] text-warn-text">
            Kit de récupération
          </span>
          <span className="ml-auto min-w-0 truncate font-mono text-[12px] text-muted">
            {username}
          </span>
        </figcaption>
        <ol className="m-0 grid list-none grid-cols-3 gap-1.5 p-0">
          {kit.split("-").map((group, i) => (
            <li
              key={i}
              className="relative flex h-11 items-center justify-center rounded-[9px] bg-glass-hi shadow-[inset_0_0_0_1px_var(--color-line)]"
            >
              <span
                aria-hidden="true"
                className="tabular absolute left-1.5 top-1 text-[9.5px] font-medium text-faint"
              >
                {i + 1}
              </span>
              <span
                className={`select-all font-mono text-[15.5px] font-medium tracking-[0.12em] ${i === 8 ? "text-muted" : "text-text"}`}
              >
                {group}
              </span>
            </li>
          ))}
        </ol>
        <p className="m-0 px-0.5 text-[11.5px] text-faint">
          Créé le {TODAY()}. Affiché une seule fois.
        </p>
      </figure>
      <div className="flex gap-2">
        <Button variant="secondary" icon={DownloadSimpleIcon} className="flex-1" onClick={download}>
          Télécharger
        </Button>
        <Button
          variant="secondary"
          icon={CopyIcon}
          className="flex-1"
          onClick={() => {
            // The same copy as a password: the kit leaves the clipboard after 30 seconds.
            copySecret(kit).then(
              () => {
                toast(
                  `Kit copié. Effacé du presse-papiers dans ${String(CLEAR_AFTER_MS / 1000)} s.`,
                );
              },
              (e: unknown) => {
                toast(errorText(e), "crit");
              },
            );
          }}
        >
          Copier
        </Button>
      </div>
    </>
  );
}

const STAKES: { icon: Icon; text: string }[] = [
  { icon: EyeSlashIcon, text: "Il ne sera plus jamais affiché." },
  { icon: CloudSlashIcon, text: "Le serveur n'en garde aucune copie lisible." },
  {
    icon: LifebuoyIcon,
    text: "Avec ton code à deux facteurs, il rouvre ton coffre si tu oublies ton mot de passe maître.",
  },
];

/** Why this sheet matters, in three plain facts. */
export function KitStakes() {
  return (
    <ul className="m-0 flex list-none flex-col gap-2 p-0">
      {STAKES.map(({ icon: IconComponent, text }) => (
        <li key={text} className="flex items-start gap-2.5 text-caption text-muted">
          <IconComponent
            size={16}
            weight="bold"
            aria-hidden="true"
            className="mt-px shrink-0 text-warn-text"
          />
          <span>{text}</span>
        </li>
      ))}
    </ul>
  );
}

/**
 * The whole moment of a new kit: the sheet, the stakes, a box to tick, then one way on. The
 * way on stays shut until the box says the kit is kept somewhere.
 */
export function RecoveryKitReveal({
  kit,
  username,
  confirmLabel,
  onConfirm,
  ready = true,
  busy = false,
  error = null,
}: {
  kit: string;
  username: string;
  confirmLabel: string;
  onConfirm: () => void;
  /** False while what comes next is not ready yet. */
  ready?: boolean;
  busy?: boolean;
  error?: string | null;
}) {
  const [noted, setNoted] = useState(false);
  return (
    <>
      <RecoveryKitPanel kit={kit} username={username} />
      <KitStakes />
      <div className="rounded-control bg-hover px-3 py-0.5">
        <Checkbox checked={noted} onChange={setNoted}>
          <span className="text-body text-text">Je l'ai noté dans un endroit sûr.</span>
        </Checkbox>
      </div>
      {error ? <ErrorNote>{error}</ErrorNote> : null}
      <Button
        size="lg"
        icon={CheckCircleIcon}
        busy={busy}
        disabled={!noted || !ready}
        onClick={onConfirm}
      >
        {confirmLabel}
      </Button>
    </>
  );
}
