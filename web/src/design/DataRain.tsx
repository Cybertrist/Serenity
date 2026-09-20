import { useEffect, useRef } from "react";

/**
 * The unlock transition: a fall of encrypted data that wipes the lock screen away from the top
 * down, and leaves the vault behind it.
 *
 * Two layers over the whole page: a curtain in the page colour that covers everything above the
 * fall's front, and the canvas the glyphs are drawn on. The canvas is cleared by composition
 * (`destination-out`) rather than repainted black, so what is underneath keeps showing through.
 */
const GLYPHS = "0123456789abcdefABCDEF+/=xKQZmnpqR";
/** Time for the front of the fall to reach the bottom of the screen. */
const WIPE = 900;
/** When the last streak has left the screen: only then does the vault take over. */
const DRAINED = 1560;
/** The canvas stops drawing here; the curtain waits for the vault. */
const TOTAL = 1900;
/** If the vault never comes (a failed hand-over), the curtain lifts anyway. */
const GUARD = 6000;
const CELL = 15;
const FONT = 13;
const TAIL = 12;

interface Drop {
  x: number;
  y: number;
  v: number;
  tail: number;
  chars: string[];
}

export function DataRain({
  lift,
  onCovered,
  onDone,
}: {
  /** True once the vault is actually mounted behind the curtain: only then does it lift. */
  lift: boolean;
  onCovered: () => void;
  onDone: () => void;
}) {
  const canvas = useRef<HTMLCanvasElement>(null);
  const curtain = useRef<HTMLDivElement>(null);
  const covered = useRef(onCovered);
  const done = useRef(onDone);
  covered.current = onCovered;
  done.current = onDone;

  // The curtain stays opaque until the vault is there, whatever the fall is doing.
  useEffect(() => {
    const veil = curtain.current;
    if (!veil || !lift) return;
    veil.style.transition = "opacity 380ms ease";
    veil.style.opacity = "0";
    const id = setTimeout(() => {
      done.current();
    }, 420);
    return () => {
      clearTimeout(id);
    };
  }, [lift]);

  useEffect(() => {
    const surface = canvas.current;
    const veil = curtain.current;
    if (!surface || !veil) return;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduce) {
      veil.style.maskImage = "none";
      veil.style.opacity = "1";
      const quick = setTimeout(() => {
        covered.current();
      }, 160);
      return () => {
        clearTimeout(quick);
      };
    }

    const ctx = surface.getContext("2d");
    if (!ctx) return;
    const dpr = Math.min(window.devicePixelRatio, 2);
    const w = window.innerWidth;
    const h = window.innerHeight;
    surface.width = Math.round(w * dpr);
    surface.height = Math.round(h * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.font = `700 ${String(FONT)}px "JetBrains Mono", ui-monospace, monospace`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";

    const step = FONT * 1.15;
    const drops: Drop[] = Array.from({ length: Math.ceil(w / CELL) }, (_, i) => ({
      x: i * CELL + CELL / 2,
      y: -Math.random() * h * 0.5,
      v: 0.8 * (0.75 + Math.random() * 0.6),
      tail: TAIL + Math.floor(Math.random() * 8),
      chars: [],
    }));

    let frame = 0;
    let ticks = 0;
    let handed = false;
    const start = performance.now();

    const draw = (now: number) => {
      const t = now - start;
      const front = Math.min(h, (t / WIPE) * h);
      // A feathered edge rather than a ruled line: the curtain has to look like the rain is
      // eating the screen, not like a box being drawn over it.
      const edge = `linear-gradient(to bottom, #000 0, #000 ${String(Math.max(0, front - 70))}px, transparent ${String(front)}px)`;
      veil.style.maskImage = edge;
      veil.style.setProperty("-webkit-mask-image", edge);
      // The vault is only told to take over once the last streak has left the screen. The
      // curtain does not move yet: it lifts when the vault is mounted behind it.
      if (!handed && t >= DRAINED) {
        handed = true;
        covered.current();
      }

      ctx.globalCompositeOperation = "destination-out";
      ctx.fillStyle = "rgba(0,0,0,0.16)";
      ctx.fillRect(0, 0, w, h);
      ctx.globalCompositeOperation = "source-over";

      // The fall never stops: once nothing new is fed at the head, the streaks drain off the
      // bottom of the screen on their own. A rain that freezes and fades looks like a bug.
      const spawning = t < WIPE + 180;
      ticks += 1;
      for (const drop of drops) {
        drop.y += drop.v * step;
        if (spawning) {
          drop.chars.unshift(GLYPHS[Math.floor(Math.random() * GLYPHS.length)] ?? "0");
          if (drop.chars.length > drop.tail) drop.chars.pop();
        } else if (ticks % 2 === 0) {
          drop.chars.pop();
        }
        for (let k = 0; k < drop.chars.length; k += 1) {
          const y = drop.y - k * step;
          if (y < -step || y > h + step) continue;
          if (k === 0 && drop.chars.length > 2) {
            ctx.fillStyle = "#f2711c";
            ctx.shadowColor = "rgba(242,113,28,0.8)";
            ctx.shadowBlur = 9;
          } else {
            // Kept dim on purpose: the fall should read as data, not as a wall of white.
            const alpha = Math.max(0, 0.34 - (k / drop.tail) * 0.34);
            ctx.fillStyle = `rgba(214,210,203,${alpha.toFixed(3)})`;
            ctx.shadowBlur = 0;
          }
          ctx.fillText(drop.chars[k] ?? "", drop.x, y);
        }
      }
      ctx.shadowBlur = 0;

      if (t < TOTAL) {
        frame = requestAnimationFrame(draw);
      } else {
        ctx.clearRect(0, 0, w, h);
      }
    };
    frame = requestAnimationFrame(draw);
    const guard = setTimeout(() => {
      done.current();
    }, GUARD);
    return () => {
      cancelAnimationFrame(frame);
      clearTimeout(guard);
    };
  }, []);

  return (
    <div aria-hidden="true" className="pointer-events-none fixed inset-0 z-50">
      <div
        ref={curtain}
        className="absolute inset-0 bg-bg"
        // Hidden until the fall starts eating the screen; the draw loop moves the edge down.
        style={{ maskImage: "linear-gradient(to bottom, #000 0, transparent 0)" }}
      />
      <canvas ref={canvas} className="absolute inset-0 h-full w-full" />
    </div>
  );
}
