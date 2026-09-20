import { useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { useSession } from "../../app/session";
import { useToast } from "../../app/toast";
import { Button, ErrorNote, Segmented, Toggle } from "../../design";
import { setPolicy, type Frequency, type Policy } from "../agent/api";
import type { VaultEntry } from "../../app/hooks/useEntries";
import { errorText } from "../account/screens/wording";

const FREQUENCIES: { value: Frequency; label: string }[] = [
  { value: 7, label: "7 jours" },
  { value: 30, label: "30 jours" },
  { value: 90, label: "90 jours" },
  { value: 180, label: "180 jours" },
  { value: null, label: "Jamais" },
];

/** Rotation frequency (agent zone) or reminder frequency (personal zone). */
export function PolicyEditor({
  entry,
  policy,
  onDone,
}: {
  entry: VaultEntry;
  policy?: Policy;
  onDone: () => void;
}) {
  const session = useSession();
  const toast = useToast();
  const queryClient = useQueryClient();
  const agentZone = entry.item.zone === "agent";
  const [frequency, setFrequency] = useState<Frequency>(
    (policy?.frequency_days ?? null) as Frequency,
  );
  const [autonomous, setAutonomous] = useState(policy?.mode === "autonomous");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const save = async () => {
    setBusy(true);
    setError(null);
    try {
      await setPolicy(
        session.api,
        entry.item.id,
        frequency,
        agentZone && autonomous ? "autonomous" : "approval",
        entry.entry.passwordChangedAt ?? entry.item.created_at,
      );
      await queryClient.invalidateQueries({ queryKey: ["policies"] });
      toast(agentZone ? "Rotation réglée." : "Rappel réglé.");
      onDone();
    } catch (e) {
      setError(errorText(e));
    } finally {
      setBusy(false);
    }
  };
  return (
    <div className="flex flex-col gap-4 rounded-card border border-line bg-surface p-4">
      <p className="m-0 text-caption text-muted">
        {agentZone ? "Changer ce mot de passe tous les…" : "Me rappeler de le changer tous les…"}
      </p>
      <Segmented
        options={FREQUENCIES}
        value={frequency}
        onChange={setFrequency}
        label="Fréquence"
      />
      {agentZone ? (
        <div className="flex items-center justify-between gap-3">
          <span className="flex flex-col">
            <span className="text-body">Sans me demander</span>
            <span className="text-caption text-muted">
              {autonomous
                ? "L'agent change le mot de passe seul, et t'en informe après coup."
                : "L'agent attend ton accord avant chaque changement."}
            </span>
          </span>
          <Toggle checked={autonomous} onChange={setAutonomous} label="Mode autonome" />
        </div>
      ) : (
        <p className="m-0 text-caption text-muted">
          Zone personnelle : l'agent ne peut rien lire ici, il peut seulement te le rappeler.
        </p>
      )}
      {error ? <ErrorNote>{error}</ErrorNote> : null}
      <div className="flex gap-2">
        <Button variant="secondary" className="flex-1" onClick={onDone}>
          Annuler
        </Button>
        <Button className="flex-1" busy={busy} onClick={() => void save()}>
          Enregistrer
        </Button>
      </div>
    </div>
  );
}
