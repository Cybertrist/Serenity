/**
 * The motion system. Every animation in the app comes from here, so timings and curves stay
 * consistent: transforms and opacity only (hardware accelerated), springs for anything the
 * user pushed, curves for anything the app decided.
 *
 * `prefers-reduced-motion` is honoured globally (`MotionConfig reducedMotion="user"`); the
 * variants below keep an opacity fallback so a reduced run still reads.
 */
import type { Transition, Variants } from "motion/react";

/** Decelerate: fast start, long settle. The default for anything appearing. */
export const EASE_OUT = [0.22, 1, 0.36, 1] as const;
/** Symmetric: for a move the user watches from start to end, like the lock turning. */
export const EASE_IN_OUT = [0.65, 0, 0.35, 1] as const;

export const EASE: Transition = { duration: 0.22, ease: EASE_OUT };

/** Small controls the finger touched: snappy, barely any overshoot. */
export const SPRING: Transition = { type: "spring", stiffness: 420, damping: 34 };
/** Panels and cards: heavier, so a large surface does not feel flicked. */
export const SOFT_SPRING: Transition = { type: "spring", stiffness: 260, damping: 30, mass: 0.9 };
/** Mechanical parts (the shackle): a visible, short bounce. */
export const PART_SPRING: Transition = { type: "spring", stiffness: 240, damping: 15 };
export const MODAL_SPRING: Transition = { type: "spring", stiffness: 380, damping: 32, mass: 0.7 };

/** Depth used across the app, so every 3D surface shares one camera. */
export const PERSPECTIVE = 1600;

/**
 * Screen change inside the square: the outgoing screen turns away and leaves on its side,
 * the incoming one arrives from the other side. `custom` carries the direction (+1 / -1).
 */
export const SCREEN: Variants = {
  initial: (direction: number) => ({
    opacity: 0,
    x: 52 * direction,
    rotateY: -14 * direction,
    scale: 0.96,
  }),
  animate: {
    opacity: 1,
    x: 0,
    rotateY: 0,
    scale: 1,
    transition: { duration: 0.42, ease: EASE_OUT },
  },
  exit: (direction: number) => ({
    opacity: 0,
    x: -46 * direction,
    rotateY: 12 * direction,
    scale: 0.97,
    transition: { duration: 0.2, ease: EASE_IN_OUT },
  }),
};

/** A dialog arrives slightly tilted, as if laid down on the page. */
export const DIALOG: Variants = {
  initial: { opacity: 0, scale: 0.94, y: 18, rotateX: 8 },
  animate: { opacity: 1, scale: 1, y: 0, rotateX: 0, transition: MODAL_SPRING },
  exit: { opacity: 0, scale: 0.97, y: 8, rotateX: 4, transition: { duration: 0.14 } },
};

/**
 * The app frame, revealed once the fall of data has drained: it comes from far away and settles
 * into place while the curtain lifts on it.
 */
export const FRAME: Variants = {
  initial: { opacity: 0, scale: 0.78 },
  animate: {
    opacity: 1,
    scale: 1,
    transition: {
      duration: 0.62,
      ease: EASE_OUT,
      when: "beforeChildren",
      staggerChildren: 0.06,
      delayChildren: 0.28,
    },
  },
};

export const FRAME_PART: Variants = {
  initial: { opacity: 0, y: 14 },
  animate: { opacity: 1, y: 0, transition: { duration: 0.42, ease: EASE_OUT } },
};

/** Lists: the container holds the rhythm, the items only say where they come from. */
export const LIST: Variants = {
  initial: {},
  animate: { transition: { staggerChildren: 0.045, delayChildren: 0.04 } },
};

export const LIST_ITEM: Variants = {
  initial: { opacity: 0, y: 14, rotateX: -12 },
  animate: { opacity: 1, y: 0, rotateX: 0, transition: { duration: 0.42, ease: EASE_OUT } },
};

/** Pressed surfaces: one gesture pair for the whole app. */
export const PRESS = { scale: 0.975 } as const;
export const LIFT = { y: -1 } as const;
