import {
  ArrowSquareOutIcon,
  ArrowsClockwiseIcon,
  BookOpenTextIcon,
  WarningIcon,
} from "@phosphor-icons/react";
import { useEffect, useState } from "react";
import { version } from "../../../../package.json";
import { desktop } from "../../../app/desktop";
import { useSession } from "../../../app/session";
import { Button, Confirm, Logo, Note, Pill, Wordmark } from "../../../design";
import { Group, Rows, SettingRow } from "./parts";

const SOURCE = "https://github.com/Cybertrist/Serenity";

/** The version of this client, as built. */
export const APP_VERSION = version;

/**
 * Where this app comes from and what it talks to. The AGPL (section 13) asks a web application
 * to offer its source to the people who use it over a network: this section is that offer, and
 * it works offline. In the desktop app it is also where you point it at another server.
 */
export function AboutSection() {
  const session = useSession();
  const bridge = desktop();
  const [server, setServer] = useState<string>(() =>
    typeof location !== "undefined" ? location.origin : "",
  );
  const [moving, setMoving] = useState(false);
  useEffect(() => {
    if (!bridge) return;
    let alive = true;
    void bridge.server().then((url) => {
      if (alive && url) setServer(url);
    });
    return () => {
      alive = false;
    };
  }, [bridge]);

  return (
    <>
      <section className="glass relative flex flex-col items-center gap-3 overflow-hidden rounded-card px-5 pb-6 pt-7 text-center">
        <span
          aria-hidden="true"
          className="pointer-events-none absolute inset-x-0 top-0 h-44 bg-[radial-gradient(55%_100%_at_50%_0%,color-mix(in_oklab,var(--color-accent)_24%,transparent),transparent_78%)]"
        />
        <span className="relative h-16 w-16">
          <span aria-hidden="true" className="mark-halo" />
          <Logo size={64} className="relative" />
        </span>
        <Wordmark size={26} />
        <p className="m-0 max-w-[40ch] text-caption text-muted">
          Ton coffre de mots de passe, chez toi, veillé par ton agent.
        </p>
        <Pill tone="accent">Version {APP_VERSION}</Pill>
      </section>

      <Group title="Cette installation">
        <Rows>
          <SettingRow
            title="Serveur"
            caption={<span className="font-mono text-[12px]">{server}</span>}
            control={session.offline ? <Pill>Injoignable</Pill> : <Pill tone="ok">Joignable</Pill>}
          />
          <SettingRow
            title="Appli"
            caption={
              bridge
                ? `Appli de bureau (${bridge.platform === "win32" ? "Windows" : bridge.platform === "darwin" ? "macOS" : "Linux"})`
                : "Dans le navigateur. Tu peux l'installer comme une appli."
            }
          />
          {bridge ? (
            <SettingRow
              stack
              title="Changer de serveur"
              caption="L'appli oublie ce serveur et te redemande son adresse. Ton coffre, lui, reste où il est."
              control={
                <Button
                  variant="secondary"
                  icon={ArrowsClockwiseIcon}
                  onClick={() => {
                    setMoving(true);
                  }}
                >
                  Changer de serveur
                </Button>
              }
            />
          ) : null}
        </Rows>
      </Group>

      <Group
        title="Code source"
        text="Licence AGPL v3. Tu peux lire, modifier et réutiliser ce code. Si tu fais tourner une version modifiée pour d'autres personnes, tu dois publier la tienne. Serenity est fourni sans aucune garantie."
      >
        <a
          href={SOURCE}
          target="_blank"
          rel="noreferrer noopener"
          className="flex min-h-11 items-center gap-2.5 rounded-control border border-line-strong bg-glass-2 px-3.5 text-[13.5px] font-medium text-text transition-colors duration-150 hover:bg-glass-hi"
        >
          <BookOpenTextIcon size={18} aria-hidden="true" className="text-accent-text" />
          Code source
          <ArrowSquareOutIcon size={15} aria-hidden="true" className="ml-auto text-faint" />
        </a>
      </Group>

      <Note tone="warn" icon={WarningIcon}>
        Serenity n'a pas encore été audité par quelqu'un d'extérieur. Tant que ce n'est pas fait,
        garde tes comptes les plus critiques ailleurs.
      </Note>
      {bridge ? (
        <Confirm
          open={moving}
          tone="warn"
          icon={ArrowsClockwiseIcon}
          title="Changer de serveur ?"
          explanation="Le coffre se verrouille et l'appli te redemande l'adresse de ton serveur. Rien n'est effacé sur le serveur actuel."
          confirmLabel="Changer de serveur"
          onCancel={() => {
            setMoving(false);
          }}
          onConfirm={() => {
            setMoving(false);
            bridge.changeServer();
          }}
        />
      ) : null}
    </>
  );
}
