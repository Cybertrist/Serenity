import { motion } from "motion/react";
import type { ReactNode } from "react";
import { EASE_OUT } from "../../design";

/**
 * Page header inside the square: the name of the screen and, under it, what the screen is for.
 * The app-wide buttons (notifications, lock, settings) live in the frame, above this.
 */
export function Header({
  title,
  subtitle,
  actions,
}: {
  title: string;
  subtitle: string;
  actions?: ReactNode;
}) {
  return (
    <header className="mb-5 flex flex-col items-center gap-3 text-center">
      <div className="flex min-w-0 flex-col items-center gap-1">
        <motion.h1
          className="m-0 text-title font-semibold uppercase tracking-[0.16em] @[620px]:text-display"
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, ease: EASE_OUT }}
        >
          {title}
        </motion.h1>
        <motion.p
          className="m-0 text-caption text-muted"
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.06, ease: EASE_OUT }}
        >
          {subtitle}
        </motion.p>
      </div>
      {actions ? <div className="flex items-center justify-center gap-2">{actions}</div> : null}
    </header>
  );
}
