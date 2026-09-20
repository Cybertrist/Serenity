import {
  ArrowLeftIcon,
  ArrowRightIcon,
  type Icon,
  PlayIcon,
  RobotIcon,
  SealWarningIcon,
  ShieldIcon,
  VaultIcon,
} from "@phosphor-icons/react";
import { AnimatePresence, motion } from "motion/react";
import { useEffect, useState, type ReactNode } from "react";
import { Button, Card, EASE_OUT, Modal, Note } from "../../design";

interface Page {
  icon: Icon;
  title: string;
  lead: string;
  body: ReactNode;
}

const PAGES: Page[] = [
  {
    icon: VaultIcon,
    title: "Le coffre",
    lead: "Un compte du quotidien = une entrée.",
    body: (
      <>
        <p className="m-0 text-body text-muted">
          Mets-y tout ce qui a un mot de passe : banque, e-mail, impôts, streaming, boutiques,
          forums. Une entrée garde le nom du service, ton identifiant, le mot de passe, l'adresse du
          site, et le code à usage unique si le site en propose un.
        </p>
        <Card className="flex flex-col gap-2">
          <p className="m-0 text-caption text-muted">À l'ajout, le générateur propose :</p>
          <p className="m-0 font-mono text-body">k9#Lm2$pQ7!xZ4&amp;wY8</p>
          <p className="m-0 text-caption text-muted">
            ou une phrase de passe, plus facile à recopier à la main.
          </p>
        </Card>
        <Note>
          Rien ne part en clair : chaque entrée est chiffrée dans ton navigateur avant d'être
          envoyée.
        </Note>
      </>
    ),
  },
  {
    icon: ShieldIcon,
    title: "Les deux zones",
    lead: "C'est toi qui décides ce que l'agent peut lire.",
    body: (
      <>
        <div className="flex flex-col gap-3">
          <Card className="flex flex-col gap-1">
            <p className="m-0 text-body font-semibold">Protégé par toi</p>
            <p className="m-0 text-caption text-muted">
              Lisible uniquement sur tes appareils déverrouillés. Ni le serveur, ni l'agent, ni
              personne d'autre.{" "}
              <strong className="text-text">Banque, e-mail principal, impôts</strong> : tout ce dont
              la perte serait grave.
            </p>
          </Card>
          <Card className="flex flex-col gap-1">
            <p className="m-0 text-body font-semibold">Confié à l'agent</p>
            <p className="m-0 text-caption text-muted">
              Le serveur peut les déchiffrer pour les surveiller et changer leur mot de passe.
              <strong className="text-text"> Streaming, forums, boutiques</strong> : les comptes
              nombreux, dont la rotation est fastidieuse à la main.
            </p>
          </Card>
        </div>
        <Note>
          Toute nouvelle entrée arrive dans « Protégé par toi ». La confier est un geste volontaire,
          entrée par entrée, avec confirmation, et réversible.
        </Note>
      </>
    ),
  },
  {
    icon: SealWarningIcon,
    title: "Les fuites",
    lead: "Savoir avant que ça ne serve à quelqu'un d'autre.",
    body: (
      <>
        <p className="m-0 text-body text-muted">
          Serenity compare tes mots de passe aux fuites connues, repère ceux que tu réutilises, ceux
          qui sont trop courts et ceux qui n'ont pas changé depuis longtemps. Tu peux aussi lui
          confier une adresse e-mail à surveiller.
        </p>
        <Note>
          La vérification se fait en k-anonymat : seuls les 5 premiers caractères de l'empreinte
          d'un mot de passe quittent ton appareil, jamais le mot de passe.
        </Note>
        <p className="m-0 text-caption text-muted">
          Une alerte te propose d'ouvrir l'entrée concernée, ou de la mettre de côté si tu sais déjà
          quoi en faire.
        </p>
      </>
    ),
  },
  {
    icon: RobotIcon,
    title: "L'agent",
    lead: "Pas d'humain dans la boucle, mais un humain informé.",
    body: (
      <>
        <p className="m-0 text-body text-muted">
          L'agent surveille la zone qui lui est confiée et prépare les changements de mot de passe.
          Il ne touche jamais à ta zone personnelle : là, il peut seulement te rappeler qu'un mot de
          passe vieillit.
        </p>
        <div className="flex flex-col gap-2">
          <p className="m-0 text-caption text-muted">Ce qui l'encadre, vérifié par le code :</p>
          <Card className="flex flex-col gap-1.5 text-caption text-muted">
            <span>• un kill switch, vérifié avant chaque action ;</span>
            <span>• une limite de rotations par jour ;</span>
            <span>• une liste de sites autorisés, tenue sur le serveur ;</span>
            <span>• une ligne de journal pour chaque geste.</span>
          </Card>
        </div>
        <Note>Une rotation « avec validation » attend ton accord. Rien ne se fait en silence.</Note>
      </>
    ),
  },
  {
    icon: PlayIcon,
    title: "Pour essayer",
    lead: "Cinq minutes, dans l'ordre.",
    body: (
      <ol className="m-0 flex list-none flex-col gap-3 p-0 text-body text-muted">
        {[
          "Ajoute une entrée avec le bouton bleu, en laissant le générateur proposer le mot de passe.",
          "Ouvre-la : copie le mot de passe (il s'efface du presse-papiers après 30 s).",
          "Confie-la à l'agent, puis règle une rotation tous les 30 jours.",
          "Passe dans l'onglet Fuites : la veille se lance et te dit ce qu'elle trouve.",
          "Dans l'onglet Agent, coupe l'agent puis relance-le : tu verras les deux lignes dans le journal.",
        ].map((text, i) => (
          <li key={i} className="flex gap-3">
            <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-accent-soft text-caption font-semibold text-accent">
              {i + 1}
            </span>
            <span className="text-caption">{text}</span>
          </li>
        ))}
      </ol>
    ),
  },
];

/** The tour of the app: what the vault holds, what the two zones mean, what the agent may do. */
export function GuideDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [page, setPage] = useState(0);
  useEffect(() => {
    if (open) setPage(0);
  }, [open]);
  const current = PAGES[page] ?? PAGES[0];
  if (!current) return null;
  const last = page === PAGES.length - 1;

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={current.title}
      subtitle={current.lead}
      icon={current.icon}
      tone="accent"
      footer={
        <div className="flex items-center gap-3">
          <span className="flex flex-1 gap-1.5" aria-hidden="true">
            {PAGES.map((p, i) => (
              <span
                key={p.title}
                className={`h-1 w-6 rounded-full transition-colors duration-300 ${i <= page ? "bg-accent" : "bg-raised"}`}
              />
            ))}
          </span>
          {page > 0 ? (
            <Button
              variant="secondary"
              icon={ArrowLeftIcon}
              onClick={() => {
                setPage(page - 1);
              }}
            >
              Précédent
            </Button>
          ) : null}
          <Button
            {...(last ? {} : { icon: ArrowRightIcon })}
            onClick={() => {
              if (last) onClose();
              else setPage(page + 1);
            }}
          >
            {last ? "J'ai compris" : "Suivant"}
          </Button>
        </div>
      }
    >
      <AnimatePresence mode="wait" initial={false}>
        <motion.div
          key={current.title}
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -20 }}
          transition={{ duration: 0.22, ease: EASE_OUT }}
          className="flex flex-col gap-4"
        >
          {current.body}
        </motion.div>
      </AnimatePresence>
    </Modal>
  );
}
