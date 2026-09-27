import { isWeak, strengthBits } from "../breaches/rules";

/** Four steps, in plain words: the bits alone mean nothing to most people. */
export interface Strength {
  level: 1 | 2 | 3 | 4;
  label: string;
}

/**
 * How strong a password is, on the same rules as the watch (features/breaches/rules.ts): a
 * password the watch calls weak never shows more than two bars here.
 */
export function strengthOf(password: string): Strength {
  const bits = strengthBits(password);
  if (isWeak(password)) return { level: bits < 40 ? 1 : 2, label: "Faible" };
  if (bits < 80) return { level: 3, label: "Correct" };
  return { level: 4, label: "Robuste" };
}

/** Level to strength, for a generated secret whose entropy is known exactly. */
export function strengthOfBits(bits: number): Strength {
  if (bits < 40) return { level: 1, label: "Faible" };
  if (bits < 60) return { level: 2, label: "Moyen" };
  if (bits < 80) return { level: 3, label: "Correct" };
  return { level: 4, label: "Robuste" };
}

const LIT: Record<Strength["level"], string> = {
  1: "bg-crit",
  2: "bg-warn",
  3: "bg-warn",
  4: "bg-ok",
};

/** Four short bars, lit up to the level: green only when the password is really strong. */
export function StrengthBars({
  strength,
  caption,
  className = "",
}: {
  strength: Strength;
  caption?: string;
  className?: string;
}) {
  return (
    <span className={`flex items-center gap-2.5 text-[12px] text-faint ${className}`}>
      <span className="flex gap-[3px]" aria-hidden="true">
        {[1, 2, 3, 4].map((i) => (
          <i
            key={i}
            className={`block h-1 w-[22px] rounded-[2px] transition-colors duration-300 ${
              i <= strength.level ? LIT[strength.level] : "bg-press"
            }`}
          />
        ))}
      </span>
      <span>{caption ?? strength.label}</span>
    </span>
  );
}

/**
 * A secret shown in clear, with its digits in blue and its symbols in violet: an O and a 0, an
 * l and a |, stop looking alike when someone has to type it by hand.
 */
export function PasswordText({ value, className = "" }: { value: string; className?: string }) {
  return (
    <span className={`break-all font-mono tracking-[0.02em] ${className}`}>
      {Array.from(value).map((c, i) =>
        /[0-9]/.test(c) ? (
          <span key={i} className="text-accent-text">
            {c}
          </span>
        ) : /[^\p{L}]/u.test(c) ? (
          <span key={i} className="text-violet-text">
            {c}
          </span>
        ) : (
          c
        ),
      )}
    </span>
  );
}

/** Masked: one plain run of dots, never grouped, always the same length. */
export const MASK = "•".repeat(16);
