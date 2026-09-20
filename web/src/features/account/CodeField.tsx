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
      <label htmlFor={id} className="text-caption text-muted">
        {label}
      </label>
      <div className="relative">
        <div className="flex gap-2" aria-hidden="true">
          {Array.from({ length: CELLS }, (_, i) => {
            const char = value[i];
            const active = i === Math.min(value.length, CELLS - 1) && value.length < CELLS;
            return (
              <span
                key={i}
                className={`flex h-[52px] flex-1 items-center justify-center rounded-control border bg-raised font-mono text-title transition-colors duration-150 ${
                  error ? "border-crit" : active ? "border-accent" : "border-line"
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
