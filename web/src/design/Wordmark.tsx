import { motion } from "motion/react";
import type { MotionProps } from "motion/react";
import { useTheme } from "./theme";

/** The two cuts of the logotype: cream for a dark screen, ink for a light one. */
const SRC = {
  dark: "/brand/wordmark.png",
  light: "/brand/wordmark-clair.png",
} as const;

/** The stencil logotype, always in the cut that the current theme can actually read. */
export function Wordmark({ className = "", ...motionProps }: { className?: string } & MotionProps) {
  return <motion.img src={SRC[useTheme()]} alt="Serenity" className={className} {...motionProps} />;
}
