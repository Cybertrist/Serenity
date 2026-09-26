import { CopyIcon, DownloadSimpleIcon } from "@phosphor-icons/react";
import { CLEAR_AFTER_MS, copySecret } from "../../app/clipboard";
import { useToast } from "../../app/toast";
import { Button } from "../../design";
import { errorText } from "./screens/wording";

/** The kit as nine groups, with the two ways to keep it. Shown once, never stored. */
export function RecoveryKitPanel({ kit, username }: { kit: string; username: string }) {
  const toast = useToast();
  const download = () => {
    const text = `Serenity : kit de récupération\n\nIdentifiant : ${username}\nClé : ${kit}\n\nGarde ce fichier hors ligne (papier, clé USB). Il permet, avec ton code TOTP, de retrouver ton coffre si tu oublies ton mot de passe maître.\n`;
    const url = URL.createObjectURL(new Blob([text], { type: "text/plain" }));
    const a = document.createElement("a");
    a.href = url;
    a.download = "serenity-kit-de-recuperation.txt";
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <>
      <div className="rounded-card bg-surface p-3 shadow-[inset_0_0_0_1px_var(--color-line)]">
        <div className="grid grid-cols-3 gap-2 font-mono text-[15px] tracking-wider">
          {kit.split("-").map((group, i) => (
            <span
              key={i}
              className={`select-all rounded-chip bg-raised py-2.5 text-center shadow-card ${i === 8 ? "text-muted" : ""}`}
            >
              {group}
            </span>
          ))}
        </div>
      </div>
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
