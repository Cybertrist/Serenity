import { useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { useSession } from "../../app/session";
import { useToast } from "../../app/toast";
import { Button, Toggle } from "../../design";
import { setPolicy, type Frequency, type Policy } from "../agent/api";
import type { VaultEntry } from "../../app/hooks/useEntries";

const FREQUENCIES: { value: Frequency; label: string }[] = [
  { value: 7, label: "7 j" },
  { value: 30, label: "30 j" },
  { value: 90, label: "90 j" },
  { value: 180, label: "180 j" },
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
  const save = async () => {
    setBusy(true);
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
    } finally {
      setBusy(false);
    }
  };
  return (
    <div className="flex flex-col gap-4 rounded-card border border-line bg-surface p-4">
      <p className="m-0 text-caption text-muted">
        {agentZone ? "Changer ce mot de passe tous les…" : "Me rappeler de le changer tous les…"}
      </p>
      <div role="radiogroup" aria-label="Fréquence" className="flex flex-wrap gap-2">
        {FREQUENCIES.map((f) => (
          <button
            key={f.label}
            type="button"
            role="radio"
            aria-checked={frequency === f.value}
            onClick={() => {
              setFrequency(f.value);
            }}
            className={`h-9 rounded-full px-3.5 text-caption font-medium ${frequency === f.value ? "bg-text text-bg" : "border border-line text-muted"}`}
          >
            {f.label}
          </button>
        ))}
      </div>
      {agentZone ? (
        <div className="flex items-center justify-between gap-3">
          <span className="flex flex-col">
            <span className="text-body">Sans me demander</span>
            <span className="text-caption text-muted">
              Sinon, l'agent attend ton accord à chaque fois.
            </span>
          </span>
          <Toggle checked={autonomous} onChange={setAutonomous} label="Mode autonome" />
        </div>
      ) : (
        <p className="m-0 text-caption text-muted">
          Zone personnelle : l'agent ne peut que te le rappeler.
        </p>
      )}
      <Button busy={busy} onClick={() => void save()}>
        Enregistrer
      </Button>
    </div>
  );
}
