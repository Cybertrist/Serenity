import { DesktopIcon, DeviceMobileIcon, SignOutIcon } from "@phosphor-icons/react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { useSession } from "../../../app/session";
import { Button, Chip, Confirm, ErrorNote, Note, Pill, Skeleton } from "../../../design";
import { relative } from "../../../lib/format";
import { errorText } from "../screens/wording";
import type { SessionPayload } from "../types";
import { deviceName, PHONE } from "./device";
import { Group, Rows, SettingRow } from "./parts";

/** The sessions of this account, shared with the settings list (it shows how many there are). */
export function useDeviceSessions() {
  const session = useSession();
  return useQuery({
    queryKey: ["sessions"],
    queryFn: () => session.api.get<SessionPayload[]>("/api/auth/sessions"),
    enabled: !session.offline,
  });
}

/** Connected devices: what holds a valid session token, and how to cut one off. */
export function DevicesSection() {
  const session = useSession();
  const queryClient = useQueryClient();
  const [revoking, setRevoking] = useState<SessionPayload | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const sessions = useDeviceSessions();

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

  // This device first, then the most recently seen.
  const list = [...(sessions.data ?? [])].sort(
    (a, b) => Number(b.current) - Number(a.current) || b.last_seen_at.localeCompare(a.last_seen_at),
  );
  return (
    <>
      <Group
        title="Appareils connectés"
        text="Chacun garde un jeton de session, jamais ton mot de passe maître. Le code à 6 chiffres est redemandé sur un nouvel appareil, puis tous les 60 jours."
      >
        {error ? <ErrorNote>{error}</ErrorNote> : null}
        {sessions.isLoading ? <Skeleton lines={2} /> : null}
        {!sessions.isLoading && list.length === 0 ? (
          <p className="m-0 text-caption text-muted">Aucune session enregistrée.</p>
        ) : null}
        {list.length ? (
          <Rows>
            {list.map((s) => (
              <SettingRow
                key={s.id}
                lead={
                  <Chip
                    icon={PHONE.test(s.device) ? DeviceMobileIcon : DesktopIcon}
                    tone={s.current ? "accent" : "neutral"}
                    size={30}
                  />
                }
                title={
                  <span className="flex items-center gap-2">
                    <span className="truncate">{deviceName(s.device)}</span>
                    {s.current ? <Pill tone="accent">Cet appareil</Pill> : null}
                  </span>
                }
                caption={`Vu ${relative(s.last_seen_at)} · expire ${relative(s.expires_at)}`}
                control={
                  s.current ? null : (
                    <Button
                      variant="ghost"
                      size="sm"
                      icon={SignOutIcon}
                      aria-label={`Déconnecter ${deviceName(s.device)}`}
                      onClick={() => {
                        setRevoking(s);
                      }}
                    >
                      Déconnecter
                    </Button>
                  )
                }
              />
            ))}
          </Rows>
        ) : null}
      </Group>
      <Note>
        Déconnecter un appareil invalide son jeton tout de suite : il redemandera le mot de passe
        maître et un code.
      </Note>
      <Confirm
        open={revoking !== null}
        busy={busy}
        icon={SignOutIcon}
        title="Déconnecter cet appareil ?"
        explanation="Son jeton de session est révoqué immédiatement. Ton coffre et tes entrées ne changent pas."
        confirmLabel="Déconnecter"
        onCancel={() => {
          setRevoking(null);
        }}
        onConfirm={() => void revoke()}
      />
    </>
  );
}
