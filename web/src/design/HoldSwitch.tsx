import { PowerIcon } from "@phosphor-icons/react";
import { useEffect, useId, useRef, useState, type KeyboardEvent, type PointerEvent } from "react";

/**
 * A switch you hold for a second (mouse, finger, Space or Enter) instead of confirming in a
 * dialog: the gesture is the confirmation. Let go before the end and it springs back.
 *
 * Made for the kill switch: `checked` is "running", the thumb sits on the left while it runs,
 * and holding it walks it to the right. Same gesture to restart.
 */
export function HoldSwitch({
  checked,
  onChange,
  label,
  onLabel = "Marche",
  offLabel = "Arrêt",
  hint = true,
  duration = 1000,
  disabled = false,
  className = "",
}: {
  checked: boolean;
  onChange: (next: boolean) => void;
  /** What the switch controls, for a screen reader ("Kill switch de l'agent"). */
  label: string;
  onLabel?: string;
  offLabel?: string;
  /** The line under the switch that says how to use it. */
  hint?: boolean;
  duration?: number;
  disabled?: boolean;
  className?: string;
}) {
  const id = useId();
  const box = useRef<HTMLButtonElement>(null);
  const frame = useRef(0);
  const started = useRef<number | null>(null);
  const [holding, setHolding] = useState(false);
  const commit = useRef(onChange);
  commit.current = onChange;

  /** Where the thumb stands, 0 on the left (running) to 1 on the right (stopped). */
  const place = (progress: number) => {
    const at = checked ? progress : 1 - progress;
    box.current?.style.setProperty("--p", at.toFixed(4));
    box.current?.style.setProperty("--hold", progress.toFixed(4));
  };

  useEffect(() => {
    place(0);
    return () => {
      cancelAnimationFrame(frame.current);
    };
    // Re-seat the thumb whenever the state changes from outside.
  }, [checked]);

  const start = () => {
    if (disabled || started.current !== null) return;
    started.current = performance.now();
    setHolding(true);
    const step = (now: number) => {
      if (started.current === null) return;
      const k = Math.min(1, (now - started.current) / duration);
      place(1 - Math.pow(1 - k, 2));
      if (k < 1) {
        frame.current = requestAnimationFrame(step);
        return;
      }
      started.current = null;
      setHolding(false);
      commit.current(!checked);
    };
    frame.current = requestAnimationFrame(step);
  };

  const stop = () => {
    if (started.current === null) return;
    started.current = null;
    cancelAnimationFrame(frame.current);
    setHolding(false);
    place(0);
  };

  const onKeyDown = (e: KeyboardEvent<HTMLButtonElement>) => {
    if ((e.key === " " || e.key === "Enter") && !e.repeat) {
      e.preventDefault();
      start();
    }
  };
  const onKeyUp = (e: KeyboardEvent<HTMLButtonElement>) => {
    if (e.key === " " || e.key === "Enter") stop();
  };
  const onPointerDown = (e: PointerEvent<HTMLButtonElement>) => {
    if (e.button !== 0) return;
    e.currentTarget.setPointerCapture(e.pointerId);
    start();
  };

  const seconds = duration >= 1000 ? `${String(Math.round(duration / 100) / 10)} s` : "un instant";
  const help = holding
    ? "Continue à maintenir"
    : checked
      ? `Maintiens ${seconds} pour arrêter`
      : `Maintiens ${seconds} pour relancer`;

  return (
    <div className={`flex flex-col gap-2 ${className}`}>
      <button
        ref={box}
        type="button"
        role="switch"
        aria-checked={checked}
        aria-label={label}
        aria-describedby={`${id}-hint`}
        disabled={disabled}
        onPointerDown={onPointerDown}
        onPointerUp={stop}
        onPointerCancel={stop}
        onLostPointerCapture={stop}
        onKeyDown={onKeyDown}
        onKeyUp={onKeyUp}
        onBlur={stop}
        onContextMenu={(e) => {
          e.preventDefault();
        }}
        data-holding={holding ? "" : undefined}
        className="group relative block h-14 w-full max-w-[420px] touch-none select-none rounded-[14px] border border-line bg-hover p-[5px] shadow-[inset_0_2px_6px_var(--color-shade)] disabled:opacity-50"
      >
        <span
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 grid grid-cols-2 items-center font-mono text-[10.5px] font-semibold uppercase tracking-[0.14em] text-faint"
        >
          <span className="text-center">{onLabel}</span>
          <span className="text-center">{offLabel}</span>
        </span>
        <span
          aria-hidden="true"
          className={`hold-fill pointer-events-none absolute inset-[5px] rounded-[10px] ${checked ? "origin-left bg-warn-soft" : "origin-right bg-ok-soft"}`}
        />
        <span
          aria-hidden="true"
          className="relative flex h-full w-[calc(50%_-_3px)] translate-x-[calc(var(--p,0)*(100%_+_6px))] items-center justify-center gap-2 rounded-[10px] border border-line-strong bg-panel font-mono text-[11px] font-semibold uppercase tracking-[0.1em] shadow-[0_4px_12px_rgb(0_0_0/0.3),inset_0_1px_0_rgb(255_255_255/0.08)] transition-transform duration-300 ease-[cubic-bezier(0.2,0.8,0.2,1)] group-data-[holding]:transition-none"
        >
          <PowerIcon size={15} weight="bold" className={checked ? "text-ok" : "text-faint"} />
          {checked ? onLabel : offLabel}
        </span>
      </button>
      <span
        id={`${id}-hint`}
        className={`font-mono text-[10.5px] font-medium uppercase tracking-[0.06em] text-faint ${hint ? "" : "sr-only"}`}
      >
        {help}
      </span>
    </div>
  );
}
