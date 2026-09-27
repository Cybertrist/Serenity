import { useId } from "react";

/*
 * The ribbon across the top of the app, edge to edge like the one on the lock screens: it
 * comes in from the left edge and leaves by the right one, always inside the window, so it
 * never stops in the middle of the screen. A glow, a core and a thin echo.
 */
const CORE = "M-60 150 C 260 70 520 190 800 110 S 1190 30 1500 80";
const ECHO = "M-60 176 C 280 104 540 214 820 138 S 1210 62 1500 110";

/**
 * The light behind the app: three soft blobs in the colours of the mood (`data-mood` on
 * <html>, see mood.ts) drifting slowly, and the ribbon of the logo across the top. It sits
 * under everything, never takes a click, and fades from one mood to the next.
 */
export function Aurora({ revealed = false }: { revealed?: boolean }) {
  const id = useId().replace(/:/g, "");
  const gradient = `aurora-${id}`;
  return (
    <div aria-hidden="true" className={`aurora ${revealed ? "aurora-revealed" : ""}`}>
      <svg viewBox="0 0 1440 240" preserveAspectRatio="none">
        <defs>
          <linearGradient
            id={gradient}
            gradientUnits="userSpaceOnUse"
            x1="0"
            y1="0"
            x2="1440"
            y2="0"
          >
            <stop offset="0" className="aurora-stop-1" stopOpacity="0" />
            <stop offset=".2" className="aurora-stop-1" stopOpacity=".7" />
            <stop offset=".55" stopColor="#fff" stopOpacity=".85" />
            <stop offset=".82" className="aurora-stop-3" stopOpacity=".7" />
            <stop offset="1" className="aurora-stop-3" stopOpacity="0" />
          </linearGradient>
        </defs>
        <path className="aurora-glow" d={CORE} vectorEffect="non-scaling-stroke" />
        <path
          className="aurora-line"
          d={CORE}
          stroke={`url(#${gradient})`}
          vectorEffect="non-scaling-stroke"
        />
        <path
          className="aurora-echo"
          d={ECHO}
          stroke={`url(#${gradient})`}
          vectorEffect="non-scaling-stroke"
        />
      </svg>
    </div>
  );
}
