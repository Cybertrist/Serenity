import { CopyIcon } from "@phosphor-icons/react";
import { useEffect, useState } from "react";
import { copySecret } from "../../app/clipboard";
import { useToast } from "../../app/toast";
import { IconButton } from "../../design";
import { currentCode } from "../../lib/totp";

/** Live one-time code of an entry, with the seconds left drawn as a ring. */
export function TotpCode({ value }: { value: string }) {
  const toast = useToast();
  const [state, setState] = useState<{ code: string; remaining: number; period: number } | null>(
    null,
  );
  const [invalid, setInvalid] = useState(false);
  useEffect(() => {
    let alive = true;
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
  if (invalid) return <span className="text-caption text-crit">Clé TOTP illisible</span>;
  if (!state) return <span className="font-mono text-title text-muted">··· ···</span>;
  const circumference = 2 * Math.PI * 15;
  const progress = state.remaining / state.period;
  const tone = state.remaining <= 5 ? "var(--color-warn)" : "var(--color-ok)";
  return (
    <div className="flex items-center gap-2">
      <span className="whitespace-nowrap font-mono text-title tracking-widest" aria-live="polite">
        {state.code.slice(0, 3)} {state.code.slice(3)}
      </span>
      <svg
        width="36"
        height="36"
        viewBox="0 0 36 36"
        role="img"
        aria-label={`${String(state.remaining)} secondes restantes`}
      >
        <circle
          cx="18"
          cy="18"
          r="15"
          fill="none"
          stroke="var(--color-neutral-soft)"
          strokeWidth="3"
        />
        <circle
          cx="18"
          cy="18"
          r="15"
          fill="none"
          stroke={tone}
          strokeWidth="3"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={circumference * (1 - progress)}
          transform="rotate(-90 18 18)"
          style={{ transition: "stroke-dashoffset 1s linear" }}
        />
        <text
          x="18"
          y="22"
          textAnchor="middle"
          fontSize="11"
          fill="var(--color-muted)"
          fontFamily="JetBrains Mono, monospace"
        >
          {state.remaining}
        </text>
      </svg>
      <IconButton
        icon={CopyIcon}
        label="Copier le code"
        onClick={() => {
          void copySecret(state.code).then(() => {
            toast("Code copié.");
          });
        }}
      />
    </div>
  );
}
