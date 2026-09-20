import type { Icon } from "@phosphor-icons/react";
import { motion } from "motion/react";
import type { MotionStyle } from "motion/react";
import type { ButtonHTMLAttributes, ReactNode } from "react";
import { LIFT, PRESS, SPRING } from "./motion";

type Variant = "primary" | "secondary" | "ghost" | "danger";

/** Motion owns these handlers on a motion component; the DOM ones would clash. */
type Native = Omit<
  ButtonHTMLAttributes<HTMLButtonElement>,
  "onAnimationStart" | "onAnimationEnd" | "onDrag" | "onDragStart" | "onDragEnd" | "style"
> & { style?: MotionStyle };

const VARIANTS: Record<Variant, string> = {
  // A disabled primary reads as unavailable, not as a dimmed orange smear.
  primary:
    "bg-accent text-on-accent font-semibold hover:brightness-110 disabled:bg-raised disabled:text-muted disabled:opacity-100",
  secondary: "bg-surface border border-line text-text font-medium hover:bg-raised",
  ghost: "bg-transparent text-accent font-medium hover:bg-accent-soft",
  danger: "bg-crit-soft text-crit font-medium hover:brightness-125",
};

export function Button({
  variant = "primary",
  icon: IconComponent,
  children,
  className = "",
  busy = false,
  ...rest
}: Native & {
  variant?: Variant;
  icon?: Icon;
  busy?: boolean;
  children: ReactNode;
}) {
  const disabled = rest.disabled === true || busy;
  return (
    <motion.button
      type="button"
      {...rest}
      disabled={disabled}
      aria-busy={busy}
      {...(disabled ? {} : { whileHover: LIFT, whileTap: PRESS })}
      transition={SPRING}
      className={`flex min-h-12 items-center justify-center gap-2 rounded-control px-4 text-body transition-[background-color,filter,opacity] duration-150 disabled:pointer-events-none disabled:opacity-50 ${VARIANTS[variant]} ${className}`}
    >
      {IconComponent ? <IconComponent size={20} aria-hidden="true" /> : null}
      <span>{busy ? "Un instant…" : children}</span>
    </motion.button>
  );
}

/** Icon-only button: 44 px touch target and a mandatory label, shown as a tooltip too. */
export function IconButton({
  icon: IconComponent,
  label,
  className = "",
  ...rest
}: Native & { icon: Icon; label: string }) {
  return (
    <motion.button
      type="button"
      aria-label={label}
      title={label}
      {...rest}
      {...(rest.disabled === true
        ? {}
        : { whileHover: { scale: 1.08 }, whileTap: { scale: 0.92 } })}
      transition={SPRING}
      className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-control text-muted transition-colors duration-150 hover:bg-hover hover:text-text disabled:pointer-events-none disabled:opacity-40 ${className}`}
    >
      <IconComponent size={20} aria-hidden="true" />
    </motion.button>
  );
}
