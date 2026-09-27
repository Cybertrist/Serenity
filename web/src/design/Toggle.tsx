import { motion } from "motion/react";
import { SPRING } from "./motion";

/** A switch, 38 x 22 like a desktop one. The hit area grows to 44 px under a finger. */
export function Toggle({
  checked,
  onChange,
  label,
  disabled = false,
}: {
  checked: boolean;
  onChange: (value: boolean) => void;
  label: string;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      disabled={disabled}
      onClick={() => {
        onChange(!checked);
      }}
      className="flex h-8 shrink-0 items-center rounded-full disabled:opacity-50 [@media(pointer:coarse)]:h-11"
    >
      <span
        className={`flex h-[22px] w-[38px] items-center rounded-full border p-[2px] transition-colors duration-200 ${checked ? "border-transparent bg-accent" : "border-line-strong bg-press"}`}
      >
        <motion.span
          initial={false}
          animate={{ x: checked ? 16 : 0 }}
          transition={SPRING}
          className="h-4 w-4 rounded-full bg-knob shadow-[0_1px_3px_rgb(0_0_0/0.35)]"
        />
      </span>
    </button>
  );
}
