import { useId, type InputHTMLAttributes } from "react";

const CELLS = 6;

/**
 * The six-digit code, shown as six boxes. The real input lies transparent over them, so the
 * field keeps its label, the numeric keyboard, paste, and one-time-code autofill.
 */
export function CodeField({
  label,
  value,
  error,
  hint,
  ...input
}: Omit<InputHTMLAttributes<HTMLInputElement>, "value"> & {
  label: string;
  value: string;
  error?: string | null;
  hint?: string;
}) {
  const id = useId();
  return (
    <div className="flex flex-col gap-2">
      <label htmlFor={id} className="px-0.5 text-caption font-medium text-muted">
        {label}
      </label>
      <div className="group relative">
        <div className="flex gap-2" aria-hidden="true">
          {Array.from({ length: CELLS }, (_, i) => {
            const char = value[i];
            const active = i === Math.min(value.length, CELLS - 1) && value.length < CELLS;
            return (
              <span
                key={i}
                // The cell being typed in wears the focus ring, and only while the field has
                // the focus: a ring on an idle field would say it is listening when it is not.
                className={`tabular flex h-[54px] flex-1 items-center justify-center rounded-control bg-surface font-mono text-title transition-shadow duration-150 ${
                  error
                    ? "shadow-[inset_0_0_0_1.5px_var(--color-crit)]"
                    : `shadow-[inset_0_0_0_1px_var(--color-line-strong)] ${active ? "group-focus-within:shadow-[inset_0_0_0_2px_var(--color-accent)]" : ""}`
                }`}
              >
                {char ?? ""}
              </span>
            );
          })}
        </div>
        <input
          id={id}
          {...input}
          value={value}
          aria-label={label}
          aria-invalid={error ? true : undefined}
          inputMode="numeric"
          maxLength={CELLS}
          autoComplete="one-time-code"
          spellCheck={false}
          className="absolute inset-0 h-full w-full cursor-text bg-transparent text-transparent caret-transparent outline-none"
        />
      </div>
      {error || hint ? (
        <p className={`m-0 text-caption ${error ? "text-crit" : "text-muted"}`}>{error ?? hint}</p>
      ) : null}
    </div>
  );
}
