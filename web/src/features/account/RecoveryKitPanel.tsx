import { CopyIcon, DownloadSimpleIcon } from "@phosphor-icons/react";
import { Button, Card } from "../../design";

/** The kit as nine groups, with the two ways to keep it. Shown once, never stored. */
export function RecoveryKitPanel({ kit, username }: { kit: string; username: string }) {
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
      <Card>
        <div className="grid grid-cols-3 gap-2 font-mono text-body tracking-wider">
          {kit.split("-").map((group, i) => (
            <span
              key={i}
              className={`select-all rounded-chip bg-raised py-2.5 text-center ${i === 8 ? "text-muted" : ""}`}
            >
              {group}
            </span>
          ))}
        </div>
      </Card>
      <div className="flex gap-2">
        <Button variant="secondary" icon={DownloadSimpleIcon} className="flex-1" onClick={download}>
          Télécharger
        </Button>
        <Button
          variant="secondary"
          icon={CopyIcon}
          className="flex-1"
          onClick={() => void navigator.clipboard.writeText(kit)}
        >
          Copier
        </Button>
      </div>
    </>
  );
}
