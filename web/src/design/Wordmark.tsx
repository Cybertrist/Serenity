import { motion } from "motion/react";
import type { MotionProps } from "motion/react";

/**
 * The logotype: "Serenity" in Syne 800, "Seren" in the colour of the text, "ity" in the brand
 * blue (#3B82F6, #2563EB on a light background). Text, not an image: sharp at any size.
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
      className={`select-none whitespace-nowrap font-display font-extrabold leading-none tracking-[-0.01em] text-text ${className}`}
      style={{ fontSize: size }}
      {...motionProps}
    >
      <span aria-hidden="true">
        Seren<span className="text-brand">ity</span>
      </span>
    </motion.span>
  );
}

/**
 * The mark: the ribbon S on its night tile (docs/logo.png, served as /logo.png). Decorative
 * by default, since it always sits next to the name; pass `label` when it stands alone.
 */
export function Logo({
  size = 28,
  className = "",
  label,
}: {
  size?: number;
  className?: string;
  label?: string;
}) {
  return (
    <img
      src="/logo.png"
      width={size}
      height={size}
      alt={label ?? ""}
      draggable={false}
      className={`block shrink-0 select-none rounded-[24%] ${className}`}
    />
  );
}
