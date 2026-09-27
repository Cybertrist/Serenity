import { useId } from "react";

/**
 * The light behind the app: three soft blobs in the colours of the mood (`data-mood` on
 * <html>, see mood.ts) drifting slowly, and one thin ribbon of light across the top. It sits
 * under everything, never takes a click, and fades from one mood to the next.
 */
export function Aurora({ revealed = false }: { revealed?: boolean }) {
  const id = useId();
  const gradient = `aurora-${id.replace(/:/g, "")}`;
  const d = "M-20 200 C 160 120 280 250 460 150 S 760 30 920 90";
  return (
    <div aria-hidden="true" className={`aurora ${revealed ? "aurora-revealed" : ""}`}>
      <svg viewBox="0 0 900 260">
        <defs>
          <linearGradient id={gradient} x1="0" x2="1">
            <stop offset="0" className="aurora-stop-1" stopOpacity="0" />
            <stop offset=".5" stopColor="#fff" stopOpacity=".7" />
            <stop offset="1" className="aurora-stop-3" stopOpacity="0" />
          </linearGradient>
        </defs>
        <path className="aurora-glow" d={d} />
        <path className="aurora-line" d={d} stroke={`url(#${gradient})`} />
      </svg>
    </div>
  );
}
