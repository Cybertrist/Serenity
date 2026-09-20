import { LockSimpleIcon } from "@phosphor-icons/react";
import { useState } from "react";
import { LOCK_CHOICES, lockMinutes, setLockMinutes } from "../../../app/prefs";
import { useSession } from "../../../app/session";
import { useToast } from "../../../app/toast";
import { Button, Note, Segmented } from "../../../design";

const OPTIONS = LOCK_CHOICES.map((v) => ({ value: v, label: `${String(v)} min` }));

/** Auto-lock delay: the only device preference, and it never leaves this device. */
export function LockSection({ onClose }: { onClose: () => void }) {
  const session = useSession();
  const toast = useToast();
  const [lock, setLock] = useState<number>(lockMinutes());
  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-2">
        <p className="m-0 text-body font-medium">Verrouillage automatique</p>
        <p className="m-0 text-caption text-muted">
          Sans activité pendant ce délai, les clés sont effacées de la mémoire et le coffre se
          referme. Il se referme aussi à la fermeture de l'onglet.
        </p>
      </div>
      <Segmented
        options={OPTIONS}
        value={lock}
        label="Délai de verrouillage"
        onChange={(v) => {
          setLock(v);
          setLockMinutes(v);
          toast("Pris en compte au prochain déverrouillage.");
        }}
      />
      <Note>
        Ce réglage est propre à cet appareil : il est gardé dans le navigateur, jamais sur le
        serveur.
      </Note>
      <Button
        variant="secondary"
        icon={LockSimpleIcon}
        onClick={() => {
          onClose();
          void session.lock();
        }}
      >
        Verrouiller maintenant
      </Button>
    </div>
  );
}
