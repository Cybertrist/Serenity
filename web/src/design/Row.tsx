import { motion } from "motion/react";
import type { ReactNode } from "react";
import { SPRING } from "./motion";

/** A list row: chip, a title and a caption, something on the right. 60 px high, 44+ touch. */
export function Row({
  chip,
  title,
  caption,
  trailing,
  onClick,
  first = false,
}: {
  chip?: ReactNode;
  title: ReactNode;
  caption?: ReactNode;
  trailing?: ReactNode;
  onClick?: () => void;
  first?: boolean;
}) {
  const content = (
    <>
      {chip}
      <span className="flex min-w-0 flex-1 flex-col text-left">
        <span className="truncate text-body font-medium">{title}</span>
        {caption ? <span className="truncate text-caption text-muted">{caption}</span> : null}
      </span>
      {trailing}
    </>
  );
  const classes = `flex min-h-[60px] w-full items-center gap-3 px-4 py-2 ${first ? "" : "border-t border-line"}`;
  return onClick ? (
    <motion.button
      type="button"
      onClick={onClick}
      whileHover={{ x: 3 }}
      whileTap={{ scale: 0.995 }}
      transition={SPRING}
      className={`${classes} transition-colors duration-150 hover:bg-hover`}
    >
      {content}
    </motion.button>
  ) : (
    <div className={classes}>{content}</div>
  );
}
