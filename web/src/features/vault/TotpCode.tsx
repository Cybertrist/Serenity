import { useEffect, useState } from "react";
import { currentCode } from "../../lib/totp";

export interface TotpState {
  code: string;
  remaining: number;
  period: number;
}

/**
 * The live one-time code of a secret, recomputed every second on this device. `invalid` when
 * the secret does not parse; `state` stays null until the first code is ready.
 */
export function useTotp(value: string): { state: TotpState | null; invalid: boolean } {
  const [state, setState] = useState<TotpState | null>(null);
  const [invalid, setInvalid] = useState(false);
  useEffect(() => {
    let alive = true;
    setInvalid(false);
    const tick = () => {
      currentCode(value)
        .then((s) => {
          if (alive) setState(s);
        })
        .catch(() => {
          if (alive) setInvalid(true);
        });
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => {
      alive = false;
      clearInterval(id);
    };
  }, [value]);
  return { state, invalid };
}

/** "090291" read as two groups of three, the way people say it out loud. */
export function spaced(code: string): string {
  return code.length === 6 ? `${code.slice(0, 3)} ${code.slice(3)}` : code;
}

/** Seconds left before the code changes, as a thin ring: blue, amber for the last five. */
export function SecondsRing({
  remaining,
  period,
  size = 22,
  className = "",
}: {
  remaining: number;
  period: number;
  size?: number;
  className?: string;
}) {
  const r = 9.5;
  const circumference = 2 * Math.PI * r;
  const low = remaining <= 5;
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      role="img"
      aria-label={`${String(remaining)} secondes restantes`}
      className={`shrink-0 -rotate-90 ${className}`}
    >
      <circle cx="12" cy="12" r={r} fill="none" strokeWidth="2.4" className="stroke-press" />
      <circle
        cx="12"
        cy="12"
        r={r}
        fill="none"
        strokeWidth="2.4"
        strokeLinecap="round"
        strokeDasharray={circumference}
        strokeDashoffset={circumference * (1 - remaining / period)}
        className={`transition-[stroke-dashoffset,stroke] duration-1000 ease-linear motion-reduce:transition-none ${low ? "stroke-warn" : "stroke-accent"}`}
      />
    </svg>
  );
}

/** Seconds before the next 30 s window, for a screen that shows many codes at once. */
export function useWindowSeconds(period = 30): number {
  const read = () => period - (Math.floor(Date.now() / 1000) % period);
  const [left, setLeft] = useState(read);
  useEffect(() => {
    const id = setInterval(() => {
      setLeft(period - (Math.floor(Date.now() / 1000) % period));
    }, 1000);
    return () => {
      clearInterval(id);
    };
  }, [period]);
  return left;
}

/** The code of an entry in its fiche: big figures, the ring, the seconds in words. */
export function TotpCode({ value, size = "md" }: { value: string; size?: "md" | "lg" }) {
  const { state, invalid } = useTotp(value);
  const figures = size === "lg" ? "text-[30px]" : "text-[22px]";
  if (invalid) return <span className="text-caption text-crit">Clé TOTP illisible</span>;
  if (!state)
    return <span className={`font-mono font-semibold text-faint ${figures}`}>··· ···</span>;
  return (
    <span className="flex items-center gap-2.5">
      <span
        className={`tabular whitespace-nowrap font-mono font-semibold leading-none tracking-[0.04em] ${figures} ${state.remaining <= 5 ? "text-warn-text" : ""}`}
      >
        {spaced(state.code)}
      </span>
      <SecondsRing remaining={state.remaining} period={state.period} />
      <span className="tabular text-[12px] text-faint" aria-hidden="true">
        {state.remaining} s
      </span>
    </span>
  );
}
