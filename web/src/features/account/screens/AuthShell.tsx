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
    <main className="flex min-h-dvh items-center justify-center px-5 py-10">
      <div className="flex w-full max-w-[420px] flex-col items-center gap-7">
        <Wordmark
          size={25}
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
        />
        <div className="w-full overflow-hidden rounded-card border-2 border-frame bg-surface shadow-[0_30px_80px_-30px_var(--color-shade-strong)]">
          <AnimatePresence mode="wait" initial={false}>
            <motion.div
              key={step}
              initial={{ opacity: 0, x: 24 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -24 }}
              transition={{ duration: 0.24, ease: EASE_OUT }}
              className="flex flex-col gap-5 p-6 sm:p-7"
            >
              {children}
            </motion.div>
          </AnimatePresence>
        </div>
        {footer ? <div className="flex w-full flex-col gap-2">{footer}</div> : null}
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
    <div className="flex flex-col gap-2">
      {step ? (
        <div className="flex items-center gap-3">
          <span className="text-caption text-muted">{`Étape ${String(step[0])} sur ${String(step[1])}`}</span>
          <span
            className="flex flex-1 gap-1.5"
            aria-label={`Étape ${String(step[0])} sur ${String(step[1])}`}
          >
            {Array.from({ length: step[1] }, (_, i) => {
              const done = step[1] === FLAG.length ? (FLAG[i] ?? "bg-accent") : "bg-accent";
              return (
                <span
                  key={i}
                  className={`h-1 flex-1 rounded-full transition-colors duration-300 ${i < step[0] ? done : "bg-raised"}`}
                />
              );
            })}
          </span>
        </div>
      ) : null}
      <div className="flex flex-col gap-1">
        <h1 className="m-0 text-title">{title}</h1>
        <p className="m-0 text-caption text-muted">{subtitle}</p>
      </div>
    </div>
  );
}
