import { motion } from "motion/react";
import { SPRING } from "./motion";

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
      className={`relative h-[34px] w-14 shrink-0 rounded-full transition-colors duration-200 disabled:opacity-50 ${checked ? "bg-accent" : "bg-raised border border-line"}`}
    >
      <motion.span
        layout
        transition={SPRING}
        className="absolute top-1 h-[26px] w-[26px] rounded-full bg-[#fff4ec]"
        style={{ left: checked ? 26 : 4 }}
      />
    </button>
  );
}
