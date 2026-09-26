import { PlusIcon } from "@phosphor-icons/react";
import { motion } from "motion/react";
import { SPRING } from "../../design";

/**
 * Adding an entry is the one thing you do from anywhere in the vault, so its button floats
 * over the screen rather than competing with the title. Round on a phone, a labelled button
 * once the app is wide enough to say what it does.
 */
export function AddButton({ onClick }: { onClick: () => void }) {
  return (
    <motion.button
      type="button"
      aria-label="Ajouter une entrée"
      title="Ajouter une entrée"
      onClick={onClick}
      initial={{ opacity: 0, scale: 0.8, y: 8 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.8 }}
      whileTap={{ scale: 0.95 }}
      transition={SPRING}
      className="absolute bottom-4 right-4 z-20 flex h-14 w-14 items-center justify-center gap-2 rounded-2xl bg-accent text-on-accent shadow-[inset_0_1px_0_rgb(255_255_255/0.25),0_16px_40px_-12px_var(--color-glow-strong)] transition-colors duration-150 hover:bg-accent-strong @[620px]:bottom-6 @[620px]:right-6 @[620px]:h-12 @[620px]:w-auto @[620px]:rounded-control @[620px]:pl-4 @[620px]:pr-5"
    >
      <PlusIcon size={22} weight="bold" aria-hidden="true" />
      <span className="hidden text-body font-semibold @[620px]:inline">Ajouter</span>
    </motion.button>
  );
}
