import { DeviceMobileIcon, TrashIcon } from "@phosphor-icons/react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { useSession } from "../../../app/session";
import {
  Card,
  Confirm,
  EmptyState,
  ErrorNote,
  IconButton,
  Note,
  Row,
  Skeleton,
} from "../../../design";
import { relative } from "../../../lib/format";
import { errorText } from "../screens/wording";
import type { SessionPayload } from "../types";

/** Connected devices: what holds a valid session token, and how to cut one off. */
export function DevicesSection() {
  const session = useSession();
  const queryClient = useQueryClient();
  const [revoking, setRevoking] = useState<SessionPayload | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const sessions = useQuery({
    queryKey: ["sessions"],
    queryFn: () => session.api.get<SessionPayload[]>("/api/auth/sessions"),
  });

  const revoke = async () => {
    if (!revoking) return;
    setBusy(true);
    setError(null);
    try {
      await session.api.delete(`/api/auth/sessions/${String(revoking.id)}`);
      await queryClient.invalidateQueries({ queryKey: ["sessions"] });
      setRevoking(null);
    } catch (e) {
      setError(errorText(e));
    } finally {
      setBusy(false);
    }
  };

  const list = sessions.data ?? [];
  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-2">
        <p className="m-0 text-body font-medium">Appareils connectés</p>
        <p className="m-0 text-caption text-muted">
          Chacun garde un jeton de session, jamais ton mot de passe maître. Le code TOTP est
          redemandé sur un nouvel appareil, puis tous les 60 jours.
        </p>
      </div>
      {error ? <ErrorNote>{error}</ErrorNote> : null}
      {sessions.isLoading ? <Skeleton lines={2} /> : null}
      {!sessions.isLoading && list.length === 0 ? (
        <EmptyState icon={DeviceMobileIcon} title="Aucune session enregistrée." />
      ) : null}
      {list.length ? (
        <Card padded={false}>
          {list.map((s, i) => (
            <Row
              key={s.id}
              first={i === 0}
              chip={<DeviceMobileIcon size={20} className="text-muted" aria-hidden="true" />}
              title={s.current ? "Cet appareil" : s.device.slice(0, 40) || "Appareil"}
              caption={`Vu ${relative(s.last_seen_at)} · expire ${relative(s.expires_at)}`}
              trailing={
                s.current ? null : (
                  <IconButton
                    icon={TrashIcon}
                    label={`Déconnecter ${s.device.slice(0, 40) || "cet appareil"}`}
                    onClick={() => {
                      setRevoking(s);
                    }}
                  />
                )
              }
            />
          ))}
        </Card>
      ) : null}
      <Note>
        Déconnecter un appareil invalide son jeton tout de suite : il redemandera le mot de passe
        maître et un code.
      </Note>
      <Confirm
        open={revoking !== null}
        busy={busy}
        icon={TrashIcon}
        title="Déconnecter cet appareil ?"
        explanation="Son jeton de session est révoqué immédiatement. Ton coffre et tes entrées ne changent pas."
        confirmLabel="Déconnecter"
        onCancel={() => {
          setRevoking(null);
        }}
        onConfirm={() => void revoke()}
      />
    </div>
  );
}
