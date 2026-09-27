import { CheckIcon, LockSimpleIcon } from "@phosphor-icons/react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { useEffect, useState, type ReactNode } from "react";
import { TitleBar } from "../../../app/shell/TitleBar";
import { EASE_OUT, Logo, Ribbons, Wordmark } from "../../../design";

/** Below this window width the entry screens are a phone: the card sits under the thumb. */
const NARROW_BELOW = 620;

/** Whether the window is phone-sized, kept up to date. */
export function useNarrow(): boolean {
  const [narrow, setNarrow] = useState(() => window.innerWidth < NARROW_BELOW);
  useEffect(() => {
    const onResize = () => {
      setNarrow(window.innerWidth < NARROW_BELOW);
    };
    window.addEventListener("resize", onResize);
    return () => {
      window.removeEventListener("resize", onResize);
    };
  }, []);
  return narrow;
}

/** Rises in, a little later for each piece: the mark, the name, the card, what follows. */
function rise(step: number, reduce: boolean | null) {
  return reduce
    ? { initial: { opacity: 0 }, animate: { opacity: 1 } }
    : {
        initial: { opacity: 0, y: 14, filter: "blur(6px)" },
        animate: { opacity: 1, y: 0, filter: "blur(0px)" },
        transition: { duration: 1, ease: EASE_OUT, delay: 0.1 + step * 0.1 },
      };
}

/**
 * The frame every entry screen shares (welcome, login, unlock, recovery): the ribbon of the
 * logo drawn across the night, the mark with its breathing halo, the name, one glass card, the
 * secondary actions under it, and a line that says where the decryption happens.
 *
 * On a phone the card sits at the bottom, field and button under the thumb, and the ribbon
 * runs through the gap above it.
 */
export function AuthShell({
  step,
  children,
  footer,
  greeting,
  wide = false,
  halo = false,
}: {
  /** Changing it slides the card: the account creation walks through three of them. */
  step: string;
  children: ReactNode;
  footer?: ReactNode;
  /** A line in the open, under the name ("Bon retour, Tristan."), outside the card. */
  greeting?: ReactNode;
  /** A wider card, for a step that shows more than a form (QR code, recovery kit). */
  wide?: boolean;
  /** The mood edge on the card: the one thing on screen that matters right now. */
  halo?: boolean;
}) {
  const reduce = useReducedMotion();
  const narrow = useNarrow();

  useEffect(() => {
    document.title = "Serenity";
  }, []);

  return (
    <main className="relative flex min-h-dvh flex-col items-center overflow-hidden bg-[radial-gradient(70%_55%_at_50%_38%,color-mix(in_oklab,var(--g1)_22%,var(--color-bg)),var(--color-bg)_70%)] px-4 [[data-theme=light]_&]:bg-[radial-gradient(70%_55%_at_50%_30%,color-mix(in_oklab,var(--g2)_14%,var(--color-bg)),var(--color-bg)_70%)]">
      <TitleBar bare />
      <Ribbons narrow={narrow} still={reduce === true} />
      <div
        className={`relative z-10 flex w-full flex-1 flex-col items-center ${wide ? "max-w-[460px]" : "max-w-[400px]"} ${narrow ? "pb-5 pt-[max(40px,env(safe-area-inset-top))]" : "justify-center py-12"}`}
      >
        <motion.div
          {...rise(0, reduce)}
          className={`relative ${narrow ? "mb-4 h-16 w-16" : "mb-5 h-[84px] w-[84px]"}`}
        >
          <span aria-hidden="true" className="mark-halo" />
          <Logo size={narrow ? 64 : 84} className="relative" />
        </motion.div>
        <Wordmark size={narrow ? 30 : 36} {...rise(1, reduce)} />
        {greeting ? (
          <motion.div {...rise(2, reduce)} className="mt-3.5 flex flex-col items-center gap-1">
            {greeting}
          </motion.div>
        ) : null}
        {/* On a phone the ribbon runs through this gap, between the name and the card. */}
        {narrow ? <span aria-hidden="true" className="min-h-[96px] flex-1" /> : null}
        <motion.div
          {...rise(3, reduce)}
          className={`glass relative w-full rounded-[18px] ${halo ? "halo" : "overflow-hidden"} ${narrow ? "" : "mt-7"}`}
        >
          <AnimatePresence mode="wait" initial={false}>
            <motion.div
              key={step}
              initial={{ opacity: 0, x: 16 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -16 }}
              transition={{ duration: 0.22, ease: EASE_OUT }}
              className="flex flex-col gap-4 px-[18px] pb-[18px] pt-5 sm:px-5 sm:pb-5 sm:pt-6"
            >
              {children}
            </motion.div>
          </AnimatePresence>
        </motion.div>
        {footer ? (
          <motion.div
            {...rise(4, reduce)}
            className="mt-4 flex max-w-full flex-col items-center gap-1 rounded-[16px] bg-[color-mix(in_oklab,var(--color-bg)_62%,transparent)] px-3.5 py-1.5 backdrop-blur-md"
          >
            {footer}
          </motion.div>
        ) : null}
      </div>
      <p className="relative z-10 m-0 flex items-center gap-1.5 pb-[max(20px,env(safe-area-inset-bottom))] text-center text-[12px] text-faint">
        <LockSimpleIcon size={13} aria-hidden="true" className="shrink-0" />
        {narrow
          ? "Déchiffré ici, jamais sur le serveur."
          : "Déchiffré sur cet appareil. Le serveur ne voit que des blocs chiffrés."}
      </p>
    </main>
  );
}

/**
 * Where a multi-step flow stands: one segment per step, named, the done ones ticked. The
 * names say what each step is for, so nobody wonders how much is left.
 */
export function Steps({ names, current }: { names: readonly string[]; current: number }) {
  return (
    <ol
      aria-label={`Étape ${String(current)} sur ${String(names.length)}`}
      className="m-0 flex list-none gap-2 p-0"
    >
      {names.map((name, i) => {
        const done = i + 1 < current;
        const here = i + 1 === current;
        return (
          <li
            key={name}
            aria-current={here ? "step" : undefined}
            className="flex min-w-0 flex-1 flex-col gap-1.5"
          >
            <span
              className={`h-1 rounded-full transition-colors duration-300 ${done || here ? "bg-accent" : "bg-track"} ${here ? "shadow-[0_0_10px_-2px_var(--color-accent)]" : ""}`}
            />
            <span
              className={`flex items-center gap-1 truncate text-[11.5px] font-medium ${here ? "text-text" : done ? "text-muted" : "text-faint"}`}
            >
              {done ? (
                <CheckIcon
                  size={11}
                  weight="bold"
                  aria-hidden="true"
                  className="text-accent-text"
                />
              ) : null}
              {name}
            </span>
          </li>
        );
      })}
    </ol>
  );
}

/** Title and one line of explanation, at the top of a card; the steps above when a flow has some. */
export function AuthHead({
  title,
  subtitle,
  steps,
}: {
  title: string;
  subtitle?: ReactNode;
  /** The names of the steps and the current one (from 1), for a multi-step flow. */
  steps?: { names: readonly string[]; current: number };
}) {
  return (
    <div className="flex flex-col gap-4">
      {steps ? <Steps names={steps.names} current={steps.current} /> : null}
      <div className="flex flex-col gap-1">
        <h1 className="m-0 text-balance font-display text-[21px] font-bold leading-tight tracking-[-0.01em]">
          {title}
        </h1>
        {subtitle ? <p className="m-0 text-[13.5px] text-muted">{subtitle}</p> : null}
      </div>
    </div>
  );
}
