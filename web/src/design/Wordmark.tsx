import { motion } from "motion/react";
import type { MotionProps } from "motion/react";

/**
 * The logotype, set in the same stencil as the screen titles: one typeface for the whole mark.
 * It was two PNG cuts before, one per theme; as text it takes the mark colour from the token,
 * stays sharp at any size, and weighs nothing.
 *
 * The "I" is the red of the keyhole. It is the only letter that is ever coloured.
 */
export function Wordmark({
  size = 14,
  className = "",
  ...motionProps
}: { size?: number; className?: string } & MotionProps) {
  return (
    <motion.span
      role="img"
      aria-label="Serenity"
      className={`select-none whitespace-nowrap font-stencil uppercase leading-none tracking-[0.08em] text-mark ${className}`}
      style={{ fontSize: size }}
      {...motionProps}
    >
      <span aria-hidden="true">
        SEREN<span className="text-rouge">I</span>TY
      </span>
    </motion.span>
  );
}
