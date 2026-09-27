import { PlusIcon } from "@phosphor-icons/react";
import { motion } from "motion/react";
import { Kbd, SPRING } from "../../design";

/**
 * Adding an entry is the one thing you do from anywhere in the vault. On a phone it is a round
 * button under the thumb, above the tabs; on a wide app a labelled button in the corner, with
 * its shortcut. The same action is on Ctrl+N and in the palette.
 */
export function AddButton({ onClick, wide }: { onClick: () => void; wide: boolean }) {
  return (
    <motion.button
      type="button"
      aria-label="Nouvelle entrée"
      title="Nouvelle entrée (Ctrl N)"
      onClick={onClick}
      initial={{ opacity: 0, scale: 0.8, y: 8 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.8 }}
      whileTap={{ scale: 0.95 }}
      transition={SPRING}
      className={`absolute z-20 flex items-center justify-center gap-2 border border-white/15 bg-linear-to-b from-[#4b8cf8] to-[#2c6ce4] text-white shadow-primary transition-[filter] duration-150 hover:brightness-110 ${
        wide
          ? "bottom-11 right-8 h-10 rounded-[11px] pl-3.5 pr-2.5 text-[14px] font-medium"
          : "bottom-[calc(86px+env(safe-area-inset-bottom))] right-4 h-14 w-14 rounded-[18px]"
      }`}
    >
      <PlusIcon size={wide ? 17 : 24} weight="bold" aria-hidden="true" />
      {wide ? (
        <>
          <span>Nouvelle entrée</span>
          <Kbd keys="mod+n" onAccent className="ml-1" />
        </>
      ) : null}
    </motion.button>
  );
}
