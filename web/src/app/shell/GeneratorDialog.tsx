import { MagicWandIcon } from "@phosphor-icons/react";
import { Modal } from "../../design";
import { Generator } from "../../features/vault/Generator";
import { copySecret } from "../clipboard";
import { useToast } from "../toast";

/**
 * The generator on its own, from the palette: make a password, copy it, go and paste it where
 * it is needed. The clipboard is cleared after 30 s, as for any secret.
 */
export function GeneratorDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const toast = useToast();
  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Générer un mot de passe"
      subtitle="Aléatoire, calculé sur cet appareil."
      icon={MagicWandIcon}
      tone="accent"
      size="sm"
    >
      <Generator
        onUse={(value) => {
          void copySecret(value).then(
            () => {
              toast("Copié. Effacé du presse-papiers dans 30 s.");
              onClose();
            },
            () => {
              toast("Copie impossible : le navigateur l'a refusée.", "warn");
            },
          );
        }}
      />
    </Modal>
  );
}
