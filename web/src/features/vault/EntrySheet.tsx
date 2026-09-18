import {
  ArrowsClockwiseIcon,
  CopyIcon,
  EyeIcon,
  EyeSlashIcon,
  LockSimpleIcon,
  PencilSimpleIcon,
  RobotIcon,
  TrashIcon,
  XIcon,
} from "@phosphor-icons/react";
import { useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { copySecret } from "../../app/clipboard";
import type { VaultEntry } from "../../app/hooks/useEntries";
import { usePolicies, useRotations } from "../../app/hooks/queries";
import { useSession } from "../../app/session";
import { useToast } from "../../app/toast";
import { Button, Card, Chip, IconButton, Pill, Sheet } from "../../design";
import { daysUntil, plural, relative } from "../../lib/format";
import { ROTATION_LABELS } from "../../lib/labels";
import { delegate, history, reclaim, trash, type HistoryEntry } from "../../vault/operations";
import { errorText } from "../account/screens/AuthLayout";
import { EntryEditor } from "./EntryEditor";
import { PolicyEditor } from "./PolicyEditor";
import { TotpCode } from "./TotpCode";
import { zoneChip } from "./zone";

function FieldRow({
  label,
  value,
  actions,
  mono = true,
}: {
  label: string;
  value: string;
  actions: React.ReactNode;
  mono?: boolean;
}) {
  return (
    <div className="flex min-h-[60px] items-center gap-2 border-t border-line first:border-t-0">
      <div className="flex min-w-0 flex-1 flex-col">
        <span className="text-caption text-muted">{label}</span>
        <span className={`truncate text-body ${mono ? "font-mono" : ""}`}>{value}</span>
      </div>
      {actions}
    </div>
  );
}

/** Entry sheet: copy, reveal, TOTP, rotation, history, delegate / reclaim. */
export function EntrySheet({ entry, onClose }: { entry: VaultEntry | null; onClose: () => void }) {
  const session = useSession();
  const toast = useToast();
  const queryClient = useQueryClient();
  const policies = usePolicies();
  const rotations = useRotations();
  const [revealed, setRevealed] = useState(false);
  const [editing, setEditing] = useState(false);
  const [policyOpen, setPolicyOpen] = useState(false);
  const [confirmMove, setConfirmMove] = useState(false);
  const [past, setPast] = useState<HistoryEntry[] | null>(null);
  const [busy, setBusy] = useState(false);

  if (!entry)
    return (
      <Sheet open={false} onClose={onClose} label="Entrée">
        {null}
      </Sheet>
    );
  const { item, entry: data } = entry;
  const agentZone = item.zone === "agent";
  const policy = policies.data?.find((p) => p.item_id === item.id);
  const openRotation = rotations.data?.find((r) => r.item_id === item.id);
  const due = daysUntil(policy?.next_due_at);
  const chip = zoneChip(item.zone);

  const copy = (value: string, what: string) => {
    void copySecret(value).then(() => {
      toast(`${what} copié. Effacé du presse-papiers dans 30 s.`);
    });
  };

  const move = async () => {
    if (!session.keyring) return;
    setBusy(true);
    try {
      const fn = agentZone ? reclaim : delegate;
      await fn(session.api, session.keyring, session.vault, item, true);
      await session.refresh();
      await queryClient.invalidateQueries();
      toast(
        agentZone
          ? "Reprise. Pense à changer ce mot de passe : le serveur l'a connu."
          : "Confiée à l'agent.",
      );
      setConfirmMove(false);
      onClose();
    } catch (e) {
      toast(errorText(e));
    } finally {
      setBusy(false);
    }
  };

  const remove = async () => {
    setBusy(true);
    try {
      await trash(session.api, session.vault, item);
      await session.refresh();
      toast("Dans la corbeille pendant 30 jours.");
      onClose();
    } catch (e) {
      toast(errorText(e));
    } finally {
      setBusy(false);
    }
  };

  const showHistory = async () => {
    if (!session.keyring) return;
    setPast(await history(session.api, session.keyring, item));
  };

  return (
    <>
      <Sheet open={!editing} onClose={onClose} label={`Fiche ${data.name}`}>
        <div className="flex items-center gap-3">
          <Chip icon={chip.icon} tone={chip.tone} />
          <div className="flex min-w-0 flex-1 flex-col">
            <h2 className="m-0 truncate text-title">{data.name}</h2>
            <span className="truncate text-caption text-muted">
              {entry.domain ?? "sans adresse"}
            </span>
          </div>
          <IconButton icon={XIcon} label="Fermer" onClick={onClose} />
        </div>
        <div className="flex flex-wrap gap-2">
          <Pill tone={agentZone ? "accent" : "neutral"}>
            {agentZone ? "Confié à l'agent" : "Protégé par toi"}
          </Pill>
          {openRotation ? (
            <Pill tone="warn">{`Rotation ${ROTATION_LABELS[openRotation.status] ?? ""}`}</Pill>
          ) : null}
        </div>

        <div className="flex flex-col">
          {data.username ? (
            <FieldRow
              label="Identifiant"
              value={data.username}
              actions={
                <IconButton
                  icon={CopyIcon}
                  label="Copier l'identifiant"
                  onClick={() => {
                    copy(data.username ?? "", "Identifiant");
                  }}
                />
              }
            />
          ) : null}
          {data.password ? (
            <FieldRow
              label="Mot de passe"
              value={revealed ? data.password : "•••• •••• •••• ••••"}
              actions={
                <>
                  <IconButton
                    icon={revealed ? EyeSlashIcon : EyeIcon}
                    label={revealed ? "Masquer le mot de passe" : "Afficher le mot de passe"}
                    onClick={() => {
                      setRevealed(!revealed);
                    }}
                  />
                  <IconButton
                    icon={CopyIcon}
                    label="Copier le mot de passe"
                    onClick={() => {
                      copy(data.password ?? "", "Mot de passe");
                    }}
                  />
                </>
              }
            />
          ) : null}
          {data.totp ? (
            <div className="flex min-h-[60px] items-center justify-between gap-2 border-t border-line">
              <span className="text-caption text-muted">Code à usage unique</span>
              <TotpCode value={data.totp} />
            </div>
          ) : null}
          {data.notes ? (
            <FieldRow label="Notes" value={data.notes} mono={false} actions={null} />
          ) : null}
        </div>

        {policyOpen ? (
          <PolicyEditor
            entry={entry}
            {...(policy ? { policy } : {})}
            onDone={() => {
              setPolicyOpen(false);
            }}
          />
        ) : (
          <button
            type="button"
            onClick={() => {
              setPolicyOpen(true);
            }}
            className="text-left"
          >
            <Card className="flex items-center gap-3">
              <Chip icon={ArrowsClockwiseIcon} tone="accent" />
              <span className="flex flex-1 flex-col">
                <span className="text-body font-medium">
                  {policy?.frequency_days
                    ? due !== null && due <= 0
                      ? agentZone
                        ? "Rotation due"
                        : "Rappel dû"
                      : `${agentZone ? "Rotation" : "Rappel"} ${relative(policy.next_due_at)}`
                    : agentZone
                      ? "Aucune rotation prévue"
                      : "Aucun rappel"}
                </span>
                <span className="text-caption text-muted">
                  {policy?.frequency_days
                    ? `Tous les ${String(policy.frequency_days)} jours · ${agentZone ? (policy.mode === "autonomous" ? "autonome" : "avec ta validation") : "rappel seulement"}`
                    : "Toucher pour régler"}
                </span>
              </span>
            </Card>
          </button>
        )}

        <div className="flex min-h-11 items-center justify-between text-caption">
          <span className="text-muted">Modifié {relative(item.updated_at)}</span>
          <button type="button" className="min-h-11 text-accent" onClick={() => void showHistory()}>
            Historique
          </button>
        </div>
        {past ? (
          <Card padded={false}>
            {past.length === 0 ? (
              <p className="m-0 py-3 text-caption text-muted">Aucune version précédente.</p>
            ) : (
              past.map((h, i) => (
                <div
                  key={h.revision}
                  className={`flex min-h-11 items-center justify-between text-caption ${i ? "border-t border-line" : ""}`}
                >
                  <span>Révision {h.revision}</span>
                  <span className="text-muted">{relative(h.created_at)}</span>
                </div>
              ))
            )}
          </Card>
        ) : null}

        {confirmMove ? (
          <Card className="flex flex-col gap-3">
            <p className="m-0 text-body">
              {agentZone
                ? "L'agent ne pourra plus le lire. Change ensuite ce mot de passe : le serveur l'a connu."
                : "L'agent pourra lire, surveiller et changer ce mot de passe."}
            </p>
            <div className="flex gap-2">
              <Button
                variant="secondary"
                className="flex-1"
                onClick={() => {
                  setConfirmMove(false);
                }}
              >
                Annuler
              </Button>
              <Button className="flex-1" busy={busy} onClick={() => void move()}>
                {agentZone ? "Reprendre" : "Confier"}
              </Button>
            </div>
          </Card>
        ) : (
          <Button
            variant="secondary"
            icon={agentZone ? LockSimpleIcon : RobotIcon}
            disabled={session.offline}
            onClick={() => {
              setConfirmMove(true);
            }}
          >
            {agentZone ? "Reprendre dans ma zone" : "Confier à l'agent"}
          </Button>
        )}
        <div className="flex gap-2">
          <Button
            variant="secondary"
            icon={PencilSimpleIcon}
            className="flex-1"
            disabled={session.offline}
            onClick={() => {
              setEditing(true);
            }}
          >
            Modifier
          </Button>
          <Button
            variant="danger"
            icon={TrashIcon}
            className="flex-1"
            busy={busy}
            disabled={session.offline}
            onClick={() => void remove()}
          >
            Supprimer
          </Button>
        </div>
        {past && past.length > 0 ? (
          <p className="m-0 text-center text-caption text-muted">
            {plural(past.length, "version précédente", "versions précédentes")}
          </p>
        ) : null}
      </Sheet>
      {editing ? (
        <EntryEditor
          open
          item={item}
          initial={data}
          onClose={() => {
            setEditing(false);
            onClose();
          }}
        />
      ) : null}
    </>
  );
}
