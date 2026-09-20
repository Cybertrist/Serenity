import { motion, useReducedMotion } from "motion/react";
import { useId } from "react";
import { EASE_OUT, PART_SPRING } from "./motion";

/**
 * The padlock of the logo, redrawn as SVG so its parts can move: filled body, thick shackle
 * held a little above it (the stencil gap), red keyhole — the mark carries the flag:
 * a blue tile in the app icon, a white padlock, a Marianne red keyhole. Geometry measured on the original
 * artwork in `web/public/brand/`.
 */
const SHACKLE = "M25 101 V75 A75 75 0 0 1 175 75 V101 H145 V75 A45 45 0 0 0 55 75 V101 Z";
const KEYHOLE = "M92 188 H108 L118 235 H82 Z";
/** Open: the shackle swings up and out of the plane, towards the viewer. */
const OPEN = { rotate: -27, y: -6, rotateY: -22 };
const SHUT = { rotate: 0, y: 0, rotateY: 0 };
/** It turns around the foot of the leg that stays in the body. */
const HINGE = { transformOrigin: "90% 100%", transformBox: "fill-box" } as const;

/** The shackle alone, for the lock whose body is a card (the entry screen). */
export function Shackle({ open, className = "" }: { open: boolean; className?: string }) {
  const reduce = useReducedMotion();
  return (
    <svg viewBox="0 0 200 101" aria-hidden="true" className={className}>
      <motion.path
        d={SHACKLE}
        fill="var(--color-mark)"
        initial={false}
        animate={open && !reduce ? OPEN : SHUT}
        transition={PART_SPRING}
        style={HINGE}
      />
    </svg>
  );
}

/**
 * The whole padlock: the brand mark, and the piece that opens when the vault does.
 * Opening also sends a light across the body — the only specular highlight in the app.
 */
export function LockMark({
  open = false,
  size = 120,
  className = "",
}: {
  open?: boolean;
  size?: number;
  className?: string;
}) {
  const reduce = useReducedMotion();
  const id = useId();
  const body = `body-${id}`;
  const sheen = `sheen-${id}`;
  return (
    <svg
      viewBox="0 0 200 268"
      width={(size * 200) / 268}
      height={size}
      aria-hidden="true"
      className={className}
    >
      <defs>
        <mask id={body} maskUnits="userSpaceOnUse">
          <rect x="0" y="121" width="200" height="147" rx="45" fill="#fff" />
          <path d={KEYHOLE} fill="#000" />
        </mask>
        <linearGradient id={sheen} x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor="#fff" stopOpacity="0" />
          <stop offset="50%" stopColor="#fff" stopOpacity="0.85" />
          <stop offset="100%" stopColor="#fff" stopOpacity="0" />
        </linearGradient>
      </defs>
      <motion.path
        d={SHACKLE}
        fill="var(--color-mark)"
        initial={false}
        animate={open && !reduce ? OPEN : SHUT}
        transition={PART_SPRING}
        style={HINGE}
      />
      <g mask={`url(#${body})`}>
        <rect x="0" y="121" width="200" height="147" rx="45" fill="var(--color-mark)" />
        {open && !reduce ? (
          <motion.rect
            x="-60"
            y="111"
            width="60"
            height="167"
            fill={`url(#${sheen})`}
            initial={{ x: -60, opacity: 0 }}
            animate={{ x: 240, opacity: [0, 1, 0] }}
            transition={{ duration: 0.75, ease: EASE_OUT, delay: 0.05 }}
          />
        ) : null}
      </g>
      <circle cx="100" cy="175" r="23" fill="var(--color-rouge)" />
    </svg>
  );
}
