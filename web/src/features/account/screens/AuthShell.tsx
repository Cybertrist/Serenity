import { AnimatePresence, motion } from "motion/react";
import type { ReactNode } from "react";
import { EASE_OUT, Wordmark } from "../../../design";

/**
 * The frame every entry screen shares: the wordmark, one card, and the secondary actions
 * under it. Nothing else: this is the first thing a stranger sees of the vault.
 */
export function AuthShell({
  step,
  children,
  footer,
}: {
  /** Changing it slides the card: the account creation walks through three of them. */
  step: string;
  children: ReactNode;
  footer?: ReactNode;
}) {
  return (
    <main className="relative flex min-h-dvh items-center justify-center overflow-hidden px-4 py-10">
      {/* One soft light behind the card, in the accent: the page is not a flat black void. */}
      <span
        aria-hidden="true"
        className="pointer-events-none absolute left-1/2 top-[38%] h-[520px] w-[720px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-glow blur-[90px]"
      />
      <div className="relative flex w-full max-w-[420px] flex-col items-center gap-8">
        <Wordmark
          size={24}
          initial={{ opacity: 0, y: -6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, ease: EASE_OUT }}
        />
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45, ease: EASE_OUT }}
          className="relative w-full overflow-hidden rounded-sheet bg-raised shadow-float"
        >
          <AnimatePresence mode="wait" initial={false}>
            <motion.div
              key={step}
              initial={{ opacity: 0, x: 16 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -16 }}
              transition={{ duration: 0.22, ease: EASE_OUT }}
              className="flex flex-col gap-5 px-5 pb-6 pt-7 sm:px-7 sm:pb-7 sm:pt-8"
            >
              {children}
            </motion.div>
          </AnimatePresence>
        </motion.div>
        {footer ? <div className="flex w-full flex-col gap-3">{footer}</div> : null}
      </div>
    </main>
  );
}

/**
 * Three steps, three bands: the account creation fills the flag as it goes. Any other count
 * falls back to the accent: the flag only means something when it is whole.
 */
const FLAG = ["bg-bleu", "bg-blanc", "bg-rouge"];

/** Title and one line of explanation, at the top of a card. */
export function AuthHead({
  title,
  subtitle,
  step,
}: {
  title: string;
  subtitle: string;
  /** [current, total], shown as a bar, for the account creation. */
  step?: [number, number];
}) {
  return (
    <div className="flex flex-col gap-4">
      {step ? (
        <div className="flex items-center gap-3">
          <span className="tabular shrink-0 text-caption font-medium text-muted">{`Étape ${String(step[0])} sur ${String(step[1])}`}</span>
          <span
            role="progressbar"
            aria-valuemin={1}
            aria-valuemax={step[1]}
            aria-valuenow={step[0]}
            aria-label="Progression"
            className="flex flex-1 gap-1.5"
          >
            {Array.from({ length: step[1] }, (_, i) => {
              const done = step[1] === FLAG.length ? (FLAG[i] ?? "bg-accent") : "bg-accent";
              return (
                <span
                  key={i}
                  className={`h-1 flex-1 rounded-full transition-colors duration-300 ${i < step[0] ? done : "bg-track"}`}
                />
              );
            })}
          </span>
        </div>
      ) : null}
      <div className="flex flex-col gap-1.5">
        <h1 className="m-0 text-title">{title}</h1>
        <p className="m-0 text-body text-muted">{subtitle}</p>
      </div>
    </div>
  );
}
