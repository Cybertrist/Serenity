/**
 * The health of the vault, as a graduated ring: one tick per step, lit up to the score. Green
 * from 85, amber from 60, red below. The score comes from the real alerts
 * (web/src/app/health.ts), never from a made-up figure.
 */
export function healthTone(score: number): "ok" | "warn" | "crit" {
  return score >= 85 ? "ok" : score >= 60 ? "warn" : "crit";
}

const INK = { ok: "var(--color-ok)", warn: "var(--color-warn)", crit: "var(--color-crit)" };

export function HealthRing({
  score,
  size = 56,
  ticks = 48,
  label = "Santé du coffre",
  showValue = true,
  className = "",
}: {
  /** 0 to 100, or null while the alerts are not known yet (the ring stays unlit). */
  score: number | null;
  size?: number;
  ticks?: number;
  label?: string;
  showValue?: boolean;
  className?: string;
}) {
  const r = size / 2;
  const outer = r - 1.5;
  const inner = r - (size > 80 ? 9 : size > 40 ? 6.5 : 4.5);
  const lit = score === null ? 0 : Math.round((Math.max(0, Math.min(100, score)) / 100) * ticks);
  const ink = score === null ? "var(--color-faint)" : INK[healthTone(score)];
  const lines = Array.from({ length: ticks }, (_, i) => {
    const a = (i / ticks) * Math.PI * 2 - Math.PI / 2;
    return {
      x1: r + outer * Math.cos(a),
      y1: r + outer * Math.sin(a),
      x2: r + inner * Math.cos(a),
      y2: r + inner * Math.sin(a),
      on: i < lit,
    };
  });
  return (
    <span
      role="img"
      aria-label={
        score === null ? `${label} : en cours de calcul` : `${label} : ${String(score)} sur 100`
      }
      className={`relative inline-grid shrink-0 place-items-center ${className}`}
      style={{ width: size, height: size }}
    >
      <svg
        viewBox={`0 0 ${String(size)} ${String(size)}`}
        width={size}
        height={size}
        aria-hidden="true"
      >
        {lines.map((l, i) => (
          <line
            key={i}
            x1={l.x1.toFixed(2)}
            y1={l.y1.toFixed(2)}
            x2={l.x2.toFixed(2)}
            y2={l.y2.toFixed(2)}
            style={{ stroke: l.on ? ink : "var(--color-track)", strokeOpacity: l.on ? 1 : 0.55 }}
            strokeWidth={size > 80 ? 2.2 : 1.6}
            strokeLinecap="round"
          />
        ))}
      </svg>
      {showValue ? (
        <span
          aria-hidden="true"
          className="tabular absolute font-display font-bold leading-none"
          style={{ fontSize: Math.round(size * 0.27) }}
        >
          {score === null ? "…" : score}
        </span>
      ) : null}
    </span>
  );
}
