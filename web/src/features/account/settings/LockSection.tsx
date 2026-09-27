import { LockSimpleIcon } from "@phosphor-icons/react";
import { useState } from "react";
import { CLEAR_AFTER_MS } from "../../../app/clipboard";
import { LOCK_CHOICES, lockMinutes, setLockMinutes } from "../../../app/prefs";
import { useSession } from "../../../app/session";
import { useToast } from "../../../app/toast";
import { Button, Note, Pill, Segmented } from "../../../design";
import { Group, Rows, SettingRow } from "./parts";

const OPTIONS = LOCK_CHOICES.map((v) => ({ value: v, label: `${String(v)} min` }));

/**
 * Auto-lock delay and lock now. The delay is a device preference, it never leaves this device;
 * the two other rows are not choices, they say what always happens.
 */
export function LockSection() {
  const session = useSession();
  const toast = useToast();
  const [lock, setLock] = useState<number>(lockMinutes());
  return (
    <>
      <Group
        title="Verrouillage automatique"
        text="Sans activité pendant ce délai, les clés sont effacées de la mémoire et le coffre se referme."
      >
        <Rows>
          <SettingRow
            stack
            title="Verrouiller après"
            caption="d'inactivité sur cet appareil."
            control={
              <div className="w-full @[760px]:w-[250px]">
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
              </div>
            }
          />
          <SettingRow
            title="À la fermeture"
            caption="Fermer l'onglet ou la fenêtre revient à verrouiller."
            control={<Pill tone="ok">Toujours</Pill>}
          />
          <SettingRow
            title="Presse-papiers"
            caption={`Un mot de passe ou un code copié s'efface après ${String(CLEAR_AFTER_MS / 1000)} s.`}
            control={<Pill tone="ok">Toujours</Pill>}
          />
        </Rows>
      </Group>
      <Group
        title="Verrouiller maintenant"
        text="Les clés quittent la mémoire tout de suite. Ton mot de passe maître rouvre le coffre, même hors ligne."
      >
        <div>
          <Button
            variant="secondary"
            icon={LockSimpleIcon}
            kbd="mod+l"
            onClick={() => {
              void session.lock();
            }}
          >
            Verrouiller maintenant
          </Button>
        </div>
      </Group>
      <Note>Réglage propre à cet appareil : gardé dans le navigateur, jamais sur le serveur.</Note>
    </>
  );
}
