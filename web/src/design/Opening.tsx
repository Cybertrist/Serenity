import { useEffect, useRef, useState } from "react";
import { Ribbons } from "./Ribbons";

/**
 * The unlock moment. The ribbon of the lock screen swells and rises, a beam of light sweeps
 * across, and the lock screen dissolves into the night blue; the vault is mounted behind that
 * veil, then the veil lifts and the vault rises into place.
 *
 * Stages: "cover" (the veil comes in, the beam sweeps), "hold" (covered, waiting for the vault),
 * "lift" (the ribbon flies up and fades, the veil opens).
 */
const COVERED = 820;
/** The beam must have crossed before the veil opens, however fast the vault mounts. */
const MIN_LIFT = 1350;
const LIFT = 800;
/** If the vault never comes (a failed hand-over), the veil lifts anyway. */
const GUARD = 6000;

type Stage = "start" | "cover" | "hold" | "lift";

export function Opening({
  lift,
  onCovered,
  onDone,
}: {
  /** True once the vault is actually mounted behind the veil: only then does it lift. */
  lift: boolean;
  onCovered: () => void;
  onDone: () => void;
}) {
  const [stage, setStage] = useState<Stage>("start");
  const [ready, setReady] = useState(false);
  const covered = useRef(onCovered);
  const done = useRef(onDone);
  covered.current = onCovered;
  done.current = onDone;
  const reduce =
    typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const narrow = typeof window !== "undefined" && window.innerWidth < 620;

  useEffect(() => {
    // One frame at rest first, so the transitions have a starting point.
    const raf = requestAnimationFrame(() => {
      setStage("cover");
    });
    const cover = setTimeout(
      () => {
        setStage((s) => (s === "cover" ? "hold" : s));
        covered.current();
      },
      reduce ? 120 : COVERED,
    );
    const min = setTimeout(
      () => {
        setReady(true);
      },
      reduce ? 160 : MIN_LIFT,
    );
    const guard = setTimeout(() => {
      setReady(true);
      setStage("lift");
    }, GUARD);
    return () => {
      cancelAnimationFrame(raf);
      clearTimeout(cover);
      clearTimeout(min);
      clearTimeout(guard);
    };
  }, [reduce]);

  useEffect(() => {
    if (lift && ready) setStage("lift");
  }, [lift, ready]);

  useEffect(() => {
    if (stage !== "lift") return;
    const id = setTimeout(
      () => {
        done.current();
      },
      reduce ? 60 : LIFT,
    );
    return () => {
      clearTimeout(id);
    };
  }, [stage, reduce]);

  return (
    <div className="opening-veil" data-stage={stage} aria-hidden="true">
      <div className="veil-bg" />
      {reduce ? null : <Ribbons narrow={narrow} still />}
      {reduce ? null : <div className="sweep" />}
    </div>
  );
}
