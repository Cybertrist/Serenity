import {
  ArrowLeftIcon,
  ArrowRightIcon,
  BinocularsIcon,
  CheckIcon,
  CloudIcon,
  DeviceMobileIcon,
  type Icon,
  KeyIcon,
  LockSimpleIcon,
  NotebookIcon,
  PlayIcon,
  ProhibitIcon,
  ShieldCheckIcon,
  SparkleIcon,
  VaultIcon,
  ArrowsClockwiseIcon,
} from "@phosphor-icons/react";
import { AnimatePresence, motion } from "motion/react";
import { useEffect, useState, type ReactNode } from "react";
import { Button, EASE_OUT, Modal } from "../../design";

/*
 * The drawings of the guide. Plain SVG, painted with the theme's own tokens (fill-*, stroke-*)
 * so they read the same in dark and in light. Each one shows a mechanism, not a mood.
 */

const LABEL = "fill-text text-[11.5px] font-semibold";
const SMALL = "fill-muted text-[10px]";

/** A Phosphor icon placed inside a drawing. */
function Glyph({
  icon: IconComponent,
  x,
  y,
  size = 18,
  className = "",
}: {
  icon: Icon;
  x: number;
  y: number;
  size?: number;
  className?: string;
}) {
  return <IconComponent x={x} y={y} size={size} weight="duotone" className={className} />;
}

/** Your device encrypts, the server only keeps blocks it cannot read. */
function VaultDrawing() {
  return (
    <svg
      viewBox="0 0 440 150"
      className="h-auto w-full"
      role="img"
      aria-label="Ton appareil chiffre, le serveur garde des blocs illisibles"
    >
      <rect
        x="8"
        y="22"
        width="148"
        height="106"
        rx="14"
        className="fill-glass-2 stroke-accent"
        strokeWidth="1.5"
      />
      <Glyph icon={DeviceMobileIcon} x={22} y={36} size={22} className="text-accent-text" />
      <text x="50" y="52" className={LABEL}>
        Ton appareil
      </text>
      <rect x="22" y="68" width="124" height="22" rx="6" className="fill-accent-soft" />
      <Glyph icon={KeyIcon} x={28} y={71} size={16} className="text-accent-text" />
      <text x="48" y="83" className={SMALL}>
        mot de passe maître
      </text>
      <text x="22" y="112" className={SMALL}>
        Il ne sort jamais d'ici.
      </text>

      <path
        d="M164 75 H 290"
        className="stroke-line-strong"
        strokeWidth="1.5"
        strokeDasharray="4 4"
      />
      <path
        d="M285 69 L 293 75 L 285 81"
        className="fill-none stroke-line-strong"
        strokeWidth="1.5"
      />
      {[0, 1, 2, 3].map((i) => (
        <rect
          key={i}
          x={186 + i * 24}
          y="64"
          width="18"
          height="22"
          rx="4"
          className="fill-hover stroke-line-strong"
        />
      ))}
      <text x="231" y="108" textAnchor="middle" className={SMALL}>
        chiffré ici, puis envoyé
      </text>

      <rect
        x="302"
        y="22"
        width="130"
        height="106"
        rx="14"
        className="fill-glass-2 stroke-line-strong"
        strokeWidth="1.5"
      />
      <Glyph icon={CloudIcon} x={316} y={36} size={22} className="text-muted" />
      <text x="344" y="52" className={LABEL}>
        Ton serveur
      </text>
      {[0, 1, 2].map((row) =>
        [0, 1, 2, 3].map((col) => (
          <rect
            key={`${String(row)}-${String(col)}`}
            x={318 + col * 26}
            y={66 + row * 14}
            width="20"
            height="9"
            rx="2.5"
            className="fill-press"
          />
        )),
      )}
      <text x="318" y="120" className={SMALL}>
        Rien de lisible.
      </text>
    </svg>
  );
}

/** The two zones, and the agent who reads one of them only. */
function ZonesDrawing() {
  const rows = (x: number, tone: string) =>
    [0, 1, 2].map((i) => (
      <g key={i}>
        <rect x={x} y={62 + i * 24} width="16" height="16" rx="5" className={tone} />
        <rect
          x={x + 24}
          y={67 + i * 24}
          width={78 - i * 14}
          height="6"
          rx="3"
          className="fill-press"
        />
      </g>
    ));
  return (
    <svg
      viewBox="0 0 440 180"
      className="h-auto w-full"
      role="img"
      aria-label="Deux zones : la tienne, que personne d'autre ne lit, et celle confiée à l'agent"
    >
      <rect
        x="8"
        y="14"
        width="190"
        height="136"
        rx="16"
        className="fill-accent-soft stroke-accent"
        strokeWidth="1.5"
      />
      <Glyph icon={ShieldCheckIcon} x={22} y={26} size={20} className="text-accent-text" />
      <text x="48" y="41" className={LABEL}>
        Protégé par toi
      </text>
      {rows(24, "fill-accent")}
      <Glyph icon={LockSimpleIcon} x={170} y={26} size={16} className="text-accent-text" />

      <rect
        x="242"
        y="14"
        width="190"
        height="136"
        rx="16"
        className="fill-violet-soft stroke-violet"
        strokeWidth="1.5"
      />
      <Glyph icon={SparkleIcon} x={256} y={26} size={20} className="text-violet-text" />
      <text x="282" y="41" className={LABEL}>
        Confié à l'agent
      </text>
      {rows(258, "fill-violet")}

      <circle cx="404" cy="122" r="15" className="fill-violet" />
      <circle cx="399" cy="117" r="5" className="fill-white/60" />
      <path
        d="M390 116 C 372 104, 372 94, 360 88"
        className="fill-none stroke-violet"
        strokeWidth="1.5"
        strokeDasharray="3 4"
      />
      <path
        d="M388 128 C 330 150, 260 150, 206 128"
        className="fill-none stroke-violet"
        strokeWidth="1.5"
        strokeDasharray="3 4"
      />
      <circle cx="214" cy="131" r="11" className="fill-bg stroke-crit" strokeWidth="1.5" />
      <Glyph icon={ProhibitIcon} x={206} y={123} size={16} className="text-crit" />

      <text x="103" y="170" textAnchor="middle" className={SMALL}>
        Lisible sur tes appareils seulement
      </text>
      <text x="337" y="170" textAnchor="middle" className={SMALL}>
        L'agent lit et change ceux-là
      </text>
    </svg>
  );
}

/** What the agent does, in order, and the switch that stops all of it. */
function AgentDrawing() {
  const steps: { icon: Icon; label: string }[] = [
    { icon: BinocularsIcon, label: "Il veille" },
    { icon: SparkleIcon, label: "Il propose" },
    { icon: ArrowsClockwiseIcon, label: "Il change" },
    { icon: NotebookIcon, label: "Il note tout" },
  ];
  return (
    <svg
      viewBox="0 0 440 170"
      className="h-auto w-full"
      role="img"
      aria-label="L'agent veille, propose, change le mot de passe et note tout, et un kill switch l'arrête"
    >
      <path d="M52 52 H 388" className="stroke-violet" strokeWidth="1.5" strokeDasharray="3 4" />
      {steps.map(({ icon, label }, i) => {
        const cx = 52 + i * 112;
        return (
          <g key={label}>
            <circle
              cx={cx}
              cy="52"
              r="24"
              className="fill-violet-soft stroke-violet"
              strokeWidth="1.5"
            />
            <Glyph icon={icon} x={cx - 11} y={41} size={22} className="text-violet-text" />
            <text x={cx} y="96" textAnchor="middle" className={LABEL}>
              {label}
            </text>
          </g>
        );
      })}
      <text x="164" y="112" textAnchor="middle" className={SMALL}>
        avec ton accord si tu le veux
      </text>

      <rect
        x="96"
        y="128"
        width="248"
        height="34"
        rx="17"
        className="fill-hover stroke-line-strong"
      />
      <rect
        x="108"
        y="136"
        width="36"
        height="18"
        rx="9"
        className="fill-press stroke-line-strong"
      />
      <circle cx="117" cy="145" r="6.5" className="fill-muted" />
      <text x="156" y="149" className={LABEL}>
        Kill switch : tout s'arrête
      </text>
    </svg>
  );
}

interface Page {
  icon: Icon;
  title: string;
  lead: string;
  drawing: ReactNode;
  body: ReactNode;
}

const PAGES: Page[] = [
  {
    icon: VaultIcon,
    title: "Ton coffre",
    lead: "Chiffré chez toi, gardé par ton serveur.",
    drawing: <VaultDrawing />,
    body: (
      <p className="m-0 text-body text-muted">
        Une entrée par compte : le site, ton identifiant, le mot de passe, et le code à usage unique
        s'il y en a un. Tout est chiffré dans ce navigateur avant de partir.
      </p>
    ),
  },
  {
    icon: ShieldCheckIcon,
    title: "Deux zones",
    lead: "C'est toi qui décides ce que l'agent peut lire.",
    drawing: <ZonesDrawing />,
    body: (
      <>
        <p className="m-0 text-body text-muted">
          <strong className="font-semibold text-text">Protégé par toi</strong> : banque, e-mail
          principal, impôts. Personne d'autre ne les lit, ni le serveur ni l'agent.
        </p>
        <p className="m-0 text-body text-muted">
          <strong className="font-semibold text-text">Confié à l'agent</strong> : les comptes
          nombreux, dont changer le mot de passe à la main est une corvée.
        </p>
        <p className="m-0 text-caption text-faint">
          Tout arrive d'abord chez toi. Confier une entrée est un geste volontaire, et réversible.
        </p>
      </>
    ),
  },
  {
    icon: SparkleIcon,
    title: "L'agent",
    lead: "Pas d'humain dans la boucle, mais un humain informé.",
    drawing: <AgentDrawing />,
    body: (
      <p className="m-0 text-body text-muted">
        Il guette les fuites, prépare les changements de mot de passe et écrit chaque geste dans le
        journal. Un kill switch, vérifié avant chaque action, l'arrête net.
      </p>
    ),
  },
];

const TRY = [
  "Ajoute une entrée, en laissant le générateur choisir le mot de passe.",
  "Confie-la à l'agent, puis règle une rotation tous les 30 jours.",
  "Passe dans Fuites : la veille te dit ce qu'elle trouve.",
  "Coupe l'agent, relance-le : les deux gestes sont dans le journal.",
];

/** The tour of the app: what the vault holds, what the two zones mean, what the agent may do. */
export function GuideDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [page, setPage] = useState(0);
  useEffect(() => {
    if (open) setPage(0);
  }, [open]);
  const total = PAGES.length + 1;
  const last = page === total - 1;
  const current = PAGES[page];

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={current ? current.title : "Pour essayer"}
      subtitle={current ? current.lead : "Quatre gestes, cinq minutes."}
      icon={current ? current.icon : PlayIcon}
      tone="accent"
      footer={
        <div className="flex items-center gap-3">
          <span
            className="flex flex-1 gap-1.5"
            aria-label={`Page ${String(page + 1)} sur ${String(total)}`}
          >
            {Array.from({ length: total }, (_, i) => (
              <button
                key={i}
                type="button"
                aria-label={`Page ${String(i + 1)}`}
                onClick={() => {
                  setPage(i);
                }}
                className="grid h-6 place-items-center"
              >
                <span
                  className={`block h-1 rounded-full transition-all duration-300 ${i === page ? "w-6 bg-accent" : i < page ? "w-3 bg-accent/60" : "w-3 bg-track"}`}
                />
              </button>
            ))}
          </span>
          {page > 0 ? (
            <Button
              variant="ghost"
              icon={ArrowLeftIcon}
              onClick={() => {
                setPage(page - 1);
              }}
            >
              Précédent
            </Button>
          ) : null}
          <Button
            {...(last ? { icon: CheckIcon } : { icon: ArrowRightIcon })}
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
          key={page}
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -20 }}
          transition={{ duration: 0.22, ease: EASE_OUT }}
          className="flex flex-col gap-4"
        >
          {current ? (
            <>
              <div className="rounded-card bg-hover px-3 py-4 shadow-[inset_0_0_0_1px_var(--color-line)]">
                {current.drawing}
              </div>
              {current.body}
            </>
          ) : (
            <ol className="m-0 flex list-none flex-col gap-2.5 p-0">
              {TRY.map((text, i) => (
                <li
                  key={text}
                  className="flex items-start gap-3 rounded-control bg-hover px-3.5 py-3 text-body"
                >
                  <span className="tabular grid h-6 w-6 shrink-0 place-items-center rounded-full bg-accent-soft text-caption font-semibold text-accent-text">
                    {i + 1}
                  </span>
                  <span className="pt-0.5">{text}</span>
                </li>
              ))}
            </ol>
          )}
        </motion.div>
      </AnimatePresence>
    </Modal>
  );
}
