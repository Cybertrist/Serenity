import type { Icon } from "@phosphor-icons/react";
import type { ButtonHTMLAttributes, ReactNode } from "react";

type Variant = "primary" | "secondary" | "ghost" | "danger";

const VARIANTS: Record<Variant, string> = {
  primary: "bg-accent text-on-accent font-semibold",
  secondary: "bg-raised border border-line text-text font-medium",
  ghost: "bg-transparent text-accent font-medium",
  danger: "bg-crit-soft text-crit font-medium",
};

export function Button({
  variant = "primary",
  icon: IconComponent,
  children,
  className = "",
  busy = false,
  ...rest
}: ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: Variant;
  icon?: Icon;
  busy?: boolean;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      {...rest}
      disabled={rest.disabled === true || busy}
      aria-busy={busy}
      className={`flex min-h-12 items-center justify-center gap-2 rounded-control px-4 text-body transition-opacity duration-200 disabled:opacity-50 ${VARIANTS[variant]} ${className}`}
    >
      {IconComponent ? <IconComponent size={20} aria-hidden="true" /> : null}
      <span>{busy ? "Un instant…" : children}</span>
    </button>
  );
}

/** Icon-only button: 44 px touch target and a mandatory label. */
export function IconButton({
  icon: IconComponent,
  label,
  className = "",
  ...rest
}: ButtonHTMLAttributes<HTMLButtonElement> & { icon: Icon; label: string }) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      {...rest}
      className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-control text-muted transition-colors duration-150 hover:text-text ${className}`}
    >
      <IconComponent size={20} aria-hidden="true" />
    </button>
  );
}
