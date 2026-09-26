import { motion } from "motion/react";
import { SPRING } from "./motion";

/** A switch. The knob moves by transform; the hit area is 44 px high whatever the track. */
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
      className="flex h-11 shrink-0 items-center disabled:opacity-50"
    >
      <span
        className={`flex h-[30px] w-[50px] items-center rounded-full p-[3px] transition-colors duration-200 ${checked ? "bg-accent" : "bg-track"}`}
      >
        <motion.span
          initial={false}
          animate={{ x: checked ? 20 : 0 }}
          transition={SPRING}
          className="h-6 w-6 rounded-full bg-knob shadow-[0_1px_3px_rgb(0_0_0/0.3)]"
        />
      </span>
    </button>
  );
}
