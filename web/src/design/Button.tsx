import type { Icon } from "@phosphor-icons/react";
import { motion } from "motion/react";
import type { MotionStyle } from "motion/react";
import type { ButtonHTMLAttributes, ReactNode } from "react";
import { Kbd } from "./Kbd";
import { SPRING } from "./motion";

type Variant = "primary" | "secondary" | "ghost" | "danger" | "link";
type Size = "sm" | "md" | "lg";

/** Motion owns these handlers on a motion component; the DOM ones would clash. */
type Native = Omit<
  ButtonHTMLAttributes<HTMLButtonElement>,
  "onAnimationStart" | "onAnimationEnd" | "onDrag" | "onDragStart" | "onDragEnd" | "style"
> & { style?: MotionStyle };

/*
 * Heights follow the pointer: dense for a mouse (34 px, as on a desktop app), 44 px under a
 * finger. `pointer:coarse` is the honest test, a narrow window with a mouse stays dense.
 */
const SIZES: Record<Size, string> = {
  sm: "h-7 px-2.5 text-[12.5px] rounded-[8px] gap-1.5 [@media(pointer:coarse)]:h-10",
  md: "h-[34px] px-3.5 text-[13.5px] rounded-[9px] gap-2 [@media(pointer:coarse)]:h-11",
  lg: "h-11 px-[18px] text-[14.5px] rounded-[11px] gap-2 [@media(pointer:coarse)]:h-12",
};

const BOX =
  "inline-flex shrink-0 select-none items-center justify-center whitespace-nowrap font-medium leading-none transition-[background,border-color,box-shadow,color,opacity] duration-150 border";

const VARIANTS: Record<Exclude<Variant, "link">, string> = {
  primary:
    "border-white/15 bg-linear-to-b from-[#4b8cf8] to-[#2c6ce4] text-white shadow-primary hover:border-white/25 hover:from-[#5a97fa] hover:to-[#3374ea] disabled:from-neutral-soft disabled:to-neutral-soft disabled:text-muted disabled:shadow-none disabled:border-line",
  secondary:
    "border-line-strong bg-glass-2 text-text hover:border-[color-mix(in_oklab,var(--color-text)_22%,transparent)] hover:bg-glass-hi",
  ghost: "border-transparent bg-transparent text-muted hover:bg-hover hover:text-text",
  danger:
    "border-[color-mix(in_oklab,var(--color-crit)_30%,transparent)] bg-crit-soft text-crit hover:border-crit",
};

export function Button({
  variant = "primary",
  size = "md",
  icon: IconComponent,
  kbd,
  children,
  className = "",
  busy = false,
  ...rest
}: Native & {
  variant?: Variant;
  size?: Size;
  icon?: Icon;
  /** Shortcut shown as key caps at the end of the button ("mod+n"). Desktop only. */
  kbd?: string;
  busy?: boolean;
  children: ReactNode;
}) {
  const disabled = rest.disabled === true || busy;
  const iconSize = size === "sm" ? 15 : size === "lg" ? 18 : 16;
  const look =
    variant === "link"
      ? "-mx-1.5 inline-flex min-h-8 items-center gap-1.5 rounded-[8px] px-1.5 text-caption font-medium text-accent-text transition-colors duration-150 hover:bg-accent-soft [@media(pointer:coarse)]:min-h-11"
      : `${BOX} ${SIZES[size]} ${VARIANTS[variant]}`;
  return (
    <motion.button
      type="button"
      {...rest}
      disabled={disabled}
      aria-busy={busy}
      {...(disabled || variant === "link" ? {} : { whileTap: { y: 1 } })}
      transition={SPRING}
      className={`disabled:pointer-events-none disabled:opacity-55 ${look} ${className}`}
    >
      {busy ? (
        <span
          aria-hidden="true"
          className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-current border-r-transparent"
        />
      ) : IconComponent ? (
        <IconComponent size={iconSize} weight="bold" aria-hidden="true" />
      ) : null}
      <span>{busy ? "Un instant…" : children}</span>
      {kbd && !busy ? (
        <Kbd
          keys={kbd}
          onAccent={variant === "primary"}
          className="ml-1 hidden [@media(pointer:fine)]:inline-flex"
        />
      ) : null}
    </motion.button>
  );
}

/** Icon-only button: a mandatory label, shown as a tooltip too. 32 px, 44 px under a finger. */
export function IconButton({
  icon: IconComponent,
  label,
  className = "",
  size = "md",
  ...rest
}: Native & { icon: Icon; label: string; size?: "sm" | "md" }) {
  const box =
    size === "sm"
      ? "h-7 w-7 rounded-[7px] [@media(pointer:coarse)]:h-10 [@media(pointer:coarse)]:w-10"
      : "h-8 w-8 rounded-[8px] [@media(pointer:coarse)]:h-11 [@media(pointer:coarse)]:w-11";
  return (
    <motion.button
      type="button"
      aria-label={label}
      title={label}
      {...rest}
      {...(rest.disabled === true ? {} : { whileTap: { scale: 0.92 } })}
      transition={SPRING}
      className={`inline-grid shrink-0 place-items-center text-muted transition-colors duration-150 hover:bg-hover hover:text-text disabled:pointer-events-none disabled:opacity-40 ${box} ${className}`}
    >
      <IconComponent size={size === "sm" ? 16 : 18} aria-hidden="true" />
    </motion.button>
  );
}
