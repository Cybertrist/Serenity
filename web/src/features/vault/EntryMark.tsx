import { useState } from "react";
import { useTheme } from "../../design";
import { logoColour, logoOf } from "./logos";
import { monogramOf } from "./monogram";

/**
 * The mark of an entry: the logo of its site.
 *
 * Three sources, in this order. The brand pack shipped with Serenity, which asks nobody
 * anything. Then, and only when the image was built with `SERENITY_FAVICONS_DISTANTES=true`,
 * the site's own favicon, fetched by the browser. Then the monogram, which always works.
 *
 * With the flag off, the CSP blocks distant images anyway: the flag exists so the app does not
 * even try, and the console stays clean.
 */

const REMOTE = import.meta.env.VITE_FAVICONS_DISTANTES === "true";

export function EntryMark({
  name,
  domain,
  size = 36,
}: {
  name: string;
  domain: string | null;
  size?: number;
}) {
  const theme = useTheme();
  // Keyed by domain: editing an entry gives the new site its own try.
  const [failed, setFailed] = useState<string | null>(null);
  const glyph = Math.round(size * 0.56);
  const tile = "flex shrink-0 items-center justify-center overflow-hidden rounded-chip";
  const logo = logoOf(domain);

  if (logo) {
    return (
      <span
        aria-hidden="true"
        className={`${tile} bg-neutral-soft`}
        style={{ width: size, height: size }}
      >
        {/* Drawn through a mask: the shape comes from the file, the colour from the theme. */}
        <span
          style={{
            width: glyph,
            height: glyph,
            backgroundColor: logoColour(logo.hex, theme),
            maskImage: `url(/logos/${logo.slug}.svg)`,
            WebkitMaskImage: `url(/logos/${logo.slug}.svg)`,
            maskSize: "contain",
            WebkitMaskSize: "contain",
            maskRepeat: "no-repeat",
            WebkitMaskRepeat: "no-repeat",
          }}
        />
      </span>
    );
  }

  if (REMOTE && domain && failed !== domain) {
    return (
      <span
        aria-hidden="true"
        className={`${tile} bg-neutral-soft`}
        style={{ width: size, height: size }}
      >
        <img
          src={`https://${domain}/favicon.ico`}
          alt=""
          width={glyph}
          height={glyph}
          loading="lazy"
          decoding="async"
          referrerPolicy="no-referrer"
          onError={() => {
            setFailed(domain);
          }}
          style={{ width: glyph, height: glyph, objectFit: "contain" }}
        />
      </span>
    );
  }

  const { letter, hue } = monogramOf(name, domain);
  const colour = theme === "dark" ? `hsl(${String(hue)} 70% 72%)` : `hsl(${String(hue)} 60% 34%)`;
  return (
    <span
      aria-hidden="true"
      className={`${tile} font-semibold`}
      style={{
        width: size,
        height: size,
        fontSize: Math.round(size * 0.42),
        color: colour,
        backgroundColor:
          theme === "dark"
            ? `hsl(${String(hue)} 70% 72% / 0.14)`
            : `hsl(${String(hue)} 60% 34% / 0.1)`,
      }}
    >
      {letter}
    </span>
  );
}
