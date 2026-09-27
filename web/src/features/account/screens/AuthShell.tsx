import { LockSimpleIcon } from "@phosphor-icons/react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { useEffect, useState, type ReactNode } from "react";
import { TitleBar } from "../../../app/shell/TitleBar";
import { EASE_OUT, Logo, Ribbons, Wordmark } from "../../../design";

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
  const reduce = useReducedMotion();
  const [narrow, setNarrow] = useState(() => window.innerWidth < 620);
  useEffect(() => {
    const onResize = () => {
      setNarrow(window.innerWidth < 620);
    };
    window.addEventListener("resize", onResize);
    return () => {
      window.removeEventListener("resize", onResize);
    };
  }, []);

  useEffect(() => {
    document.title = "Serenity";
  }, []);

  return (
    <main className="relative flex min-h-dvh flex-col items-center overflow-hidden bg-[radial-gradient(70%_55%_at_50%_38%,color-mix(in_oklab,var(--g1)_22%,var(--color-bg)),var(--color-bg)_70%)] px-4 [[data-theme=light]_&]:bg-[radial-gradient(70%_55%_at_50%_38%,color-mix(in_oklab,var(--g2)_12%,var(--color-bg)),var(--color-bg)_70%)]">
      <TitleBar bare />
      <Ribbons narrow={narrow} still={reduce === true} />
      <div
        className={`relative z-10 flex w-full max-w-[400px] flex-1 flex-col items-center ${narrow ? "pb-5 pt-[max(40px,env(safe-area-inset-top))]" : "justify-center py-12"}`}
      >
        <motion.div
          {...rise(0, reduce)}
          className={`relative ${narrow ? "mb-4 h-16 w-16" : "mb-5 h-[84px] w-[84px]"}`}
        >
          <span aria-hidden="true" className="mark-halo" />
          <Logo size={narrow ? 64 : 84} className="relative" />
        </motion.div>
        <Wordmark size={narrow ? 30 : 36} {...rise(1, reduce)} />
        {/* On a phone the ribbon runs through this gap, between the name and the card. */}
        {narrow ? <span aria-hidden="true" className="min-h-[120px] flex-1" /> : null}
        <motion.div
          {...rise(3, reduce)}
          className={`glass relative w-full overflow-hidden rounded-[18px] ${narrow ? "" : "mt-7"}`}
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
            className="mt-4 flex w-full flex-col items-center gap-2.5"
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
    <div className="flex flex-col gap-3.5">
      {step ? (
        <div className="flex items-center gap-3">
          <span className="tabular shrink-0 text-[12px] font-medium text-faint">{`Étape ${String(step[0])} sur ${String(step[1])}`}</span>
          <span
            role="progressbar"
            aria-valuemin={1}
            aria-valuemax={step[1]}
            aria-valuenow={step[0]}
            aria-label="Progression"
            className="flex flex-1 gap-1.5"
          >
            {Array.from({ length: step[1] }, (_, i) => (
              <span
                key={i}
                className={`h-1 flex-1 rounded-full transition-colors duration-300 ${i < step[0] ? "bg-accent shadow-[0_0_10px_-2px_var(--color-accent)]" : "bg-track"}`}
              />
            ))}
          </span>
        </div>
      ) : null}
      <div className="flex flex-col gap-1">
        <h1 className="m-0 font-display text-[21px] font-bold leading-tight tracking-[-0.01em]">
          {title}
        </h1>
        <p className="m-0 text-[13.5px] text-muted">{subtitle}</p>
      </div>
    </div>
  );
}
