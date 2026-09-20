import { PlusIcon } from "@phosphor-icons/react";
import { motion } from "motion/react";
import { SPRING } from "../../design";

/**
 * Adding an entry is the one thing you do from anywhere in the vault, so its button floats
 * over the screen rather than competing with the title.
 */
export function AddButton({ onClick }: { onClick: () => void }) {
  return (
    <motion.button
      type="button"
      aria-label="Ajouter une entrée"
      title="Ajouter une entrée"
      onClick={onClick}
      initial={{ opacity: 0, scale: 0.6, y: 12 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.6 }}
      whileHover={{ scale: 1.06 }}
      whileTap={{ scale: 0.94 }}
      transition={SPRING}
      className="absolute bottom-5 right-5 z-20 flex h-14 w-14 items-center justify-center rounded-[20px] bg-accent text-on-accent shadow-[0_14px_36px_-10px_rgb(242_118_46/0.7)]"
    >
      <motion.span
        aria-hidden="true"
        initial={false}
        whileHover={{ rotate: 90 }}
        transition={SPRING}
        className="flex"
      >
        <PlusIcon size={26} weight="bold" />
      </motion.span>
    </motion.button>
  );
}
