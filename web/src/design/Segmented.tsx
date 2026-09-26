import { motion } from "motion/react";
import { useId } from "react";
import { SPRING } from "./motion";

export interface Option<T> {
  value: T;
  label: string;
}

/**
 * A row of exclusive choices in one track. The selected one is marked by a single thumb that
 * slides from the previous choice, so the eye follows where the selection went.
 */
export function Segmented<T extends string | number | null>({
  options,
  value,
  onChange,
  label,
}: {
  options: readonly Option<T>[];
  value: T;
  onChange: (value: T) => void;
  label: string;
  /** Kept for callers; every size is now the same. */
  size?: "sm" | "md";
}) {
  const group = useId();
  return (
    <div
      role="radiogroup"
      aria-label={label}
      className="flex flex-wrap gap-1 rounded-control bg-neutral-soft p-1 shadow-[inset_0_0_0_1px_var(--color-line)]"
    >
      {options.map((option) => {
        const selected = option.value === value;
        return (
          <button
            key={String(option.value)}
            type="button"
            role="radio"
            aria-checked={selected}
            onClick={() => {
              onChange(option.value);
            }}
            className={`relative min-h-9 flex-1 whitespace-nowrap rounded-[9px] px-3 text-caption font-medium transition-colors duration-150 [@media(pointer:coarse)]:min-h-11 ${
              selected ? "text-text" : "text-muted hover:text-text"
            }`}
          >
            {selected ? (
              <motion.span
                layoutId={`segmented-${group}`}
                transition={SPRING}
                aria-hidden="true"
                className="absolute inset-0 rounded-[9px] bg-raised shadow-[0_1px_3px_var(--color-shade),inset_0_0_0_1px_var(--color-line)]"
              />
            ) : null}
            <span className="relative">{option.label}</span>
          </button>
        );
      })}
    </div>
  );
}
