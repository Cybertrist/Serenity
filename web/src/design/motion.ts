/**
 * The motion system. Every animation in the app comes from here, so timings and curves stay
 * consistent: transforms and opacity only (hardware accelerated), springs for anything the
 * user pushed, curves for anything the app decided. Nothing turns in 3D and nothing loops:
 * a vault that fidgets does not look calm.
 *
 * `prefers-reduced-motion` is honoured globally (`MotionConfig reducedMotion="user"`); the
 * variants below keep an opacity fallback so a reduced run still reads.
 */
import type { Transition, Variants } from "motion/react";

/** Decelerate: fast start, long settle. The default for anything appearing. */
export const EASE_OUT = [0.22, 1, 0.36, 1] as const;
/** Symmetric: for a move the user watches from start to end, like the lock turning. */
export const EASE_IN_OUT = [0.65, 0, 0.35, 1] as const;

export const EASE: Transition = { duration: 0.2, ease: EASE_OUT };

/** Small controls the finger touched: snappy, barely any overshoot. */
export const SPRING: Transition = { type: "spring", stiffness: 520, damping: 38 };
/** Panels and cards: heavier, so a large surface does not feel flicked. */
export const SOFT_SPRING: Transition = { type: "spring", stiffness: 300, damping: 32, mass: 0.9 };
/** Mechanical parts (the shackle): a visible, short bounce. */
export const PART_SPRING: Transition = { type: "spring", stiffness: 240, damping: 15 };
export const MODAL_SPRING: Transition = { type: "spring", stiffness: 460, damping: 36, mass: 0.7 };

/** Screen change inside the app: a short fade with a few pixels of travel, no more. */
export const SCREEN: Variants = {
  initial: { opacity: 0, y: 8 },
  animate: { opacity: 1, y: 0, transition: { duration: 0.28, ease: EASE_OUT } },
  exit: { opacity: 0, transition: { duration: 0.12, ease: EASE_IN_OUT } },
};

/** A dialog rises a little and settles. */
export const DIALOG: Variants = {
  initial: { opacity: 0, scale: 0.97, y: 10 },
  animate: { opacity: 1, scale: 1, y: 0, transition: MODAL_SPRING },
  exit: { opacity: 0, scale: 0.98, y: 4, transition: { duration: 0.12 } },
};

/** The app, revealed once the fall of data has drained: it settles into place. */
export const FRAME: Variants = {
  initial: { opacity: 0, scale: 0.985 },
  animate: {
    opacity: 1,
    scale: 1,
    transition: { duration: 0.45, ease: EASE_OUT, when: "beforeChildren", staggerChildren: 0.05 },
  },
};

export const FRAME_PART: Variants = {
  initial: { opacity: 0 },
  animate: { opacity: 1, transition: { duration: 0.3, ease: EASE_OUT } },
};

/** Lists: the container holds the rhythm, the items only say where they come from. */
export const LIST: Variants = {
  initial: {},
  animate: { transition: { staggerChildren: 0.03, delayChildren: 0.02 } },
};

export const LIST_ITEM: Variants = {
  initial: { opacity: 0, y: 6 },
  animate: { opacity: 1, y: 0, transition: { duration: 0.3, ease: EASE_OUT } },
};

/** Pressed surfaces: one gesture for the whole app. */
export const PRESS = { scale: 0.98 } as const;
