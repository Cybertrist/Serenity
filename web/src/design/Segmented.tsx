import { motion } from "motion/react";
import { useId } from "react";
import { SPRING } from "./motion";

export interface Option<T> {
  value: T;
  label: string;
  /** A quiet figure after the label ("Toi 8"). */
  count?: number;
}

/**
 * A row of exclusive choices in one track. The selected one is marked by a single glass thumb
 * that slides from the previous choice, so the eye follows where the selection went.
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
      className="flex flex-wrap gap-0.5 rounded-control border border-line bg-hover p-[3px]"
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
            className={`relative inline-flex h-[28px] flex-1 items-center justify-center gap-1.5 whitespace-nowrap rounded-[7px] px-2.5 text-[12.5px] font-medium transition-colors duration-150 [@media(pointer:coarse)]:h-10 ${
              selected ? "text-text" : "text-muted hover:text-text"
            }`}
          >
            {selected ? (
              <motion.span
                layoutId={`segmented-${group}`}
                transition={SPRING}
                aria-hidden="true"
                className="absolute inset-0 rounded-[7px] bg-glass-hi shadow-[0_1px_2px_rgb(0_0_0/0.2),inset_0_0_0_1px_var(--color-line-strong)]"
              />
            ) : null}
            <span className="relative">{option.label}</span>
            {option.count !== undefined ? (
              <span className="tabular relative text-faint">{option.count}</span>
            ) : null}
          </button>
        );
      })}
    </div>
  );
}
