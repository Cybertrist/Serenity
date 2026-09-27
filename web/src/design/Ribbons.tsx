import { useId } from "react";
import { useTheme } from "./theme";

/** The ribbon of the S, stretched across a wide screen, then across a phone. */
const WIDE = [
  "M-120 770 C 200 630 420 890 720 670 S 1180 370 1560 500",
  "M-120 830 C 240 700 470 930 760 720 S 1220 430 1560 560",
  "M-120 710 C 230 570 440 830 700 630 S 1150 320 1560 450",
];
const NARROW = [
  "M-80 360 C 40 270 150 450 250 330 S 380 190 480 250",
  "M-80 415 C 60 325 170 495 270 385 S 390 245 480 305",
  "M-80 315 C 50 225 140 405 240 285 S 370 145 480 205",
];

/**
 * The lit ribbon of the logo, drawn across the whole screen: a wide soft glow, a band, a
 * bright core and a thin echo, drawn in one after the other, then a spark that travels
 * along. The entry screens stand on it; the unlock moment makes it swell and rise.
 *
 * `still` draws it complete at once (reduced motion, or the opening veil which takes over an
 * already drawn ribbon).
 */
export function Ribbons({
  narrow = false,
  still = false,
  className = "",
}: {
  narrow?: boolean;
  still?: boolean;
  className?: string;
}) {
  const theme = useTheme();
  const raw = useId().replace(/:/g, "");
  const paths = narrow ? NARROW : WIDE;
  const width = narrow ? 390 : 1440;
  const stroke = `url(#rb-${theme}-${raw})`;
  const soft = `rb-soft-${raw}`;
  const glow = `rb-glow-${raw}`;
  return (
    <svg
      aria-hidden="true"
      className={`ribbons ${narrow ? "ribbons-narrow" : ""} ${still ? "ribbons-still" : ""} ${className}`}
      viewBox={narrow ? "0 0 390 844" : "0 0 1440 900"}
      preserveAspectRatio="xMidYMid slice"
    >
      <defs>
        <linearGradient
          id={`rb-dark-${raw}`}
          gradientUnits="userSpaceOnUse"
          x1="0"
          y1="0"
          x2={width}
          y2="0"
        >
          <stop offset="0" stopColor="#1D4ED8" stopOpacity="0" />
          <stop offset=".22" stopColor="#2563EB" />
          <stop offset=".48" stopColor="#DBEAFE" />
          <stop offset=".56" stopColor="#FFFFFF" />
          <stop offset=".78" stopColor="#3B82F6" />
          <stop offset="1" stopColor="#6D28D9" stopOpacity="0" />
        </linearGradient>
        <linearGradient
          id={`rb-light-${raw}`}
          gradientUnits="userSpaceOnUse"
          x1="0"
          y1="0"
          x2={width}
          y2="0"
        >
          <stop offset="0" stopColor="#93C5FD" stopOpacity="0" />
          <stop offset=".3" stopColor="#3B82F6" />
          <stop offset=".55" stopColor="#1D4ED8" />
          <stop offset=".8" stopColor="#60A5FA" />
          <stop offset="1" stopColor="#8B5CF6" stopOpacity="0" />
        </linearGradient>
        <filter id={soft} x="-20%" y="-50%" width="140%" height="200%">
          <feGaussianBlur stdDeviation="22" />
        </filter>
        <filter id={glow} x="-20%" y="-50%" width="140%" height="200%">
          <feGaussianBlur stdDeviation="3" />
        </filter>
      </defs>
      <path
        className="rb-wide"
        pathLength={1}
        d={paths[0]}
        stroke={stroke}
        filter={`url(#${soft})`}
      />
      <path className="rb-mid" pathLength={1} d={paths[1]} stroke={stroke} />
      <path className="rb-core" pathLength={1} d={paths[0]} stroke={stroke} />
      <path className="rb-thin" pathLength={1} d={paths[2]} stroke={stroke} />
      <path className="rb-spark" pathLength={1} d={paths[0]} filter={`url(#${glow})`} />
    </svg>
  );
}
