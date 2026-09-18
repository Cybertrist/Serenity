/** Motion presets: 150 to 250 ms, soft curves, a light spring for toggles and sheets. */
import type { Transition } from "motion/react";

export const EASE: Transition = { duration: 0.2, ease: [0.25, 0.1, 0.25, 1] };
export const SPRING: Transition = { type: "spring", stiffness: 420, damping: 34 };
export const SHEET_SPRING: Transition = { type: "spring", stiffness: 320, damping: 34 };

/** List items fade in with a very short stagger. */
export function stagger(index: number): Transition {
  return { ...EASE, delay: Math.min(index, 8) * 0.03 };
}
