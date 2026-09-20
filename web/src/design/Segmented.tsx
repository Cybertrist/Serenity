import { motion } from "motion/react";
import { useId } from "react";
import { SPRING } from "./motion";

export interface Option<T> {
  value: T;
  label: string;
}

/**
 * A row of exclusive choices. The selected one is marked by a single pill that
 * slides from the previous choice, so the eye follows where the selection went.
 */
export function Segmented<T extends string | number | null>({
  options,
  value,
  onChange,
  label,
  size = "md",
}: {
  options: readonly Option<T>[];
  value: T;
  onChange: (value: T) => void;
  label: string;
  size?: "sm" | "md";
}) {
  const group = useId();
  const height = size === "sm" ? "h-8" : "h-9";
  return (
    <div role="radiogroup" aria-label={label} className="flex flex-wrap gap-1.5">
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
            className={`relative ${height} rounded-full px-3.5 text-caption font-medium transition-colors duration-150 ${
              selected
                ? "text-on-accent"
                : "border border-line text-muted hover:bg-hover hover:text-text"
            }`}
          >
            {selected ? (
              <motion.span
                layoutId={`segmented-${group}`}
                transition={SPRING}
                aria-hidden="true"
                className="absolute inset-0 rounded-full bg-accent"
              />
            ) : null}
            <span className="relative">{option.label}</span>
          </button>
        );
      })}
    </div>
  );
}
