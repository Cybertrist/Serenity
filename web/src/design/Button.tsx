import type { Icon } from "@phosphor-icons/react";
import { motion } from "motion/react";
import type { MotionStyle } from "motion/react";
import type { ButtonHTMLAttributes, ReactNode } from "react";
import { PRESS, SPRING } from "./motion";

type Variant = "primary" | "secondary" | "ghost" | "danger" | "link";

/** Motion owns these handlers on a motion component; the DOM ones would clash. */
type Native = Omit<
  ButtonHTMLAttributes<HTMLButtonElement>,
  "onAnimationStart" | "onAnimationEnd" | "onDrag" | "onDragStart" | "onDragEnd" | "style"
> & { style?: MotionStyle };

const BOX =
  "flex min-h-11 items-center justify-center gap-2 rounded-control px-4 text-body transition-[background-color,box-shadow,color,opacity] duration-150";

const VARIANTS: Record<Variant, string> = {
  // A disabled primary reads as unavailable, not as a dimmed blue smear.
  primary: `${BOX} bg-accent font-semibold text-on-accent shadow-[inset_0_1px_0_rgb(255_255_255/0.22),0_1px_2px_rgb(0_0_0/0.2)] hover:bg-accent-strong disabled:bg-neutral-soft disabled:text-muted disabled:shadow-none`,
  secondary: `${BOX} bg-neutral-soft font-medium text-text shadow-[inset_0_0_0_1px_var(--color-line)] hover:bg-hover hover:shadow-[inset_0_0_0_1px_var(--color-line-strong)]`,
  ghost: `${BOX} bg-transparent font-medium text-accent hover:bg-accent-soft`,
  danger: `${BOX} bg-crit-soft font-medium text-crit hover:shadow-[inset_0_0_0_1px_var(--color-crit)]`,
  // Inline action in a sentence or a card footer: text only, but a full 44 px hit area.
  link: "-mx-2 inline-flex min-h-11 items-center gap-1.5 rounded-control px-2 text-caption font-medium text-accent transition-colors duration-150 hover:bg-accent-soft",
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
      {...(disabled || variant === "link" ? {} : { whileTap: PRESS })}
      transition={SPRING}
      className={`disabled:pointer-events-none disabled:opacity-55 ${VARIANTS[variant]} ${className}`}
    >
      {busy ? (
        <span
          aria-hidden="true"
          className="h-4 w-4 animate-spin rounded-full border-2 border-current border-r-transparent"
        />
      ) : IconComponent ? (
        <IconComponent size={variant === "link" ? 16 : 19} weight="bold" aria-hidden="true" />
      ) : null}
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
      {...(rest.disabled === true ? {} : { whileTap: { scale: 0.92 } })}
      transition={SPRING}
      className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-control text-muted transition-colors duration-150 hover:bg-hover hover:text-text disabled:pointer-events-none disabled:opacity-40 ${className}`}
    >
      <IconComponent size={20} aria-hidden="true" />
    </motion.button>
  );
}
