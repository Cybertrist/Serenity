import { BookOpenTextIcon, ScalesIcon, WarningIcon } from "@phosphor-icons/react";
import { LockMark, Note } from "../../../design";

const SOURCE = "https://github.com/Cybertrist/Serenity";

/**
 * Where this app comes from. The AGPL (section 13) asks a web application to offer its source
 * to the people who use it over a network: this section is that offer, and it works offline.
 */
export function AboutSection() {
  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center gap-4 rounded-card border border-line bg-surface p-5">
        <LockMark size={54} />
        <div className="flex flex-col gap-1">
          <p className="m-0 text-body font-medium">Serenity</p>
          <p className="m-0 text-caption text-muted">
            Ton coffre de mots de passe, chez toi, veillé par ton agent.
          </p>
        </div>
      </div>
      <a
        href={SOURCE}
        target="_blank"
        rel="noreferrer noopener"
        className="flex min-h-12 items-center gap-2 rounded-control border border-line bg-surface px-4 text-body font-medium text-accent transition-colors duration-150 hover:bg-hover"
      >
        <BookOpenTextIcon size={20} aria-hidden="true" />
        Code source
      </a>
      <div className="flex flex-col gap-2 rounded-card border border-line bg-surface p-5">
        <p className="m-0 flex items-center gap-2 text-body font-medium">
          <ScalesIcon size={20} weight="duotone" aria-hidden="true" />
          Licence AGPL v3
        </p>
        <p className="m-0 text-caption text-muted">
          Tu peux lire, modifier et réutiliser ce code. Si tu fais tourner une version modifiée pour
          d'autres personnes, tu dois publier la tienne. Serenity est fourni sans aucune garantie.
        </p>
      </div>
      <Note tone="warn" icon={WarningIcon}>
        Serenity n'a pas encore été audité par quelqu'un d'extérieur. Tant que ce n'est pas fait,
        garde tes comptes les plus critiques ailleurs.
      </Note>
    </div>
  );
}
