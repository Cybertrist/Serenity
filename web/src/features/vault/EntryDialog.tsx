import {
  ArrowsClockwiseIcon,
  CaretDownIcon,
  ClockCounterClockwiseIcon,
  CopyIcon,
  EyeIcon,
  EyeSlashIcon,
  LockSimpleIcon,
  PencilSimpleIcon,
  RobotIcon,
  TrashIcon,
  WarningIcon,
} from "@phosphor-icons/react";
import { useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { copySecret } from "../../app/clipboard";
import type { VaultEntry } from "../../app/hooks/useEntries";
import { usePolicies, useRotations } from "../../app/hooks/queries";
import { useSession } from "../../app/session";
import { useToast } from "../../app/toast";
import { Button, Card, Chip, Confirm, IconButton, Modal, Note, Pill } from "../../design";
import { daysUntil, plural, relative } from "../../lib/format";
import { ROTATION_LABELS } from "../../lib/labels";
import {
  delegate,
  history,
  reclaim,
  resolvePending,
  trash,
  type HistoryEntry,
} from "../../vault/operations";
import { decryptPending } from "../../vault/state";
import { errorText } from "../account/screens/wording";
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
  actions?: React.ReactNode;
  mono?: boolean;
}) {
  return (
    <div className="flex min-h-[60px] items-center gap-2 px-4 py-2 [&+&]:border-t [&+&]:border-line">
      <div className="flex min-w-0 flex-1 flex-col">
        <span className="text-caption text-muted">{label}</span>
        <span className={`truncate text-body ${mono ? "font-mono" : ""}`}>{value}</span>
      </div>
      {actions}
    </div>
  );
}

/** Entry dialog: copy, reveal, TOTP, rotation, history, delegate / reclaim, delete. */
export function EntryDialog({ entry, onClose }: { entry: VaultEntry | null; onClose: () => void }) {
  const session = useSession();
  const toast = useToast();
  const queryClient = useQueryClient();
  const policies = usePolicies();
  const rotations = useRotations();
  const [revealed, setRevealed] = useState(false);
  const [editing, setEditing] = useState(false);
  const [policyOpen, setPolicyOpen] = useState(false);
  const [confirmMove, setConfirmMove] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [past, setPast] = useState<HistoryEntry[] | null>(null);
  const [busy, setBusy] = useState(false);

  if (!entry)
    return (
      <Modal open={false} onClose={onClose} title="Entrée">
        {null}
      </Modal>
    );
  const { item, entry: data } = entry;
  const agentZone = item.zone === "agent";
  const policy = policies.data?.find((p) => p.item_id === item.id);
  const openRotation = rotations.data?.find((r) => r.item_id === item.id);
  const due = daysUntil(policy?.next_due_at);
  const chip = zoneChip(item.zone);
  // The password the site may have taken, when a rollback could not put things back.
  const pending = session.keyring ? decryptPending(session.keyring, item) : null;

  const decide = async (keep: "current" | "pending") => {
    setBusy(true);
    try {
      await resolvePending(session.api, session.vault, item, keep);
      await session.refresh();
      toast(keep === "pending" ? "Gardé : celui de l'agent." : "Gardé : celui du coffre.");
    } catch (e) {
      toast(errorText(e), "crit");
    } finally {
      setBusy(false);
    }
  };

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
        agentZone ? "warn" : "ok",
      );
      setConfirmMove(false);
      onClose();
    } catch (e) {
      toast(errorText(e), "crit");
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
      setConfirmDelete(false);
      onClose();
    } catch (e) {
      toast(errorText(e), "crit");
    } finally {
      setBusy(false);
    }
  };

  const showHistory = async () => {
    if (!session.keyring) return;
    if (past) {
      setPast(null);
      return;
    }
    setPast(await history(session.api, session.keyring, item));
  };

  const rotationTitle = policy?.frequency_days
    ? due !== null && due <= 0
      ? agentZone
        ? "Rotation due"
        : "Rappel dû"
      : `${agentZone ? "Rotation" : "Rappel"} ${relative(policy.next_due_at)}`
    : agentZone
      ? "Aucune rotation prévue"
      : "Aucun rappel";

  return (
    <>
      <Modal
        open={!editing && !confirmMove && !confirmDelete}
        onClose={onClose}
        title={data.name}
        subtitle={entry.domain ?? "sans adresse"}
        header={
          <>
            <Chip icon={chip.icon} tone={chip.tone} size={44} duotone />
            <div className="flex min-w-0 flex-1 flex-col gap-1">
              <h2 className="m-0 truncate text-title">{data.name}</h2>
              <div className="flex flex-wrap items-center gap-2">
                <Pill tone={agentZone ? "accent" : "neutral"}>
                  {agentZone ? "Confié à l'agent" : "Protégé par toi"}
                </Pill>
                {entry.domain ? (
                  <span className="truncate text-caption text-muted">{entry.domain}</span>
                ) : null}
                {openRotation ? (
                  <Pill tone="warn">{`Rotation ${ROTATION_LABELS[openRotation.status] ?? ""}`}</Pill>
                ) : null}
              </div>
            </div>
          </>
        }
        footer={
          <div className="flex flex-col gap-2 sm:flex-row">
            <Button
              variant="secondary"
              icon={agentZone ? LockSimpleIcon : RobotIcon}
              className="sm:flex-1"
              disabled={session.offline}
              onClick={() => {
                setConfirmMove(true);
              }}
            >
              {agentZone ? "Reprendre" : "Confier à l'agent"}
            </Button>
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
                disabled={session.offline}
                onClick={() => {
                  setConfirmDelete(true);
                }}
              >
                Supprimer
              </Button>
            </div>
          </div>
        }
      >
        {pending ? (
          <Card className="flex flex-col gap-3 border-warn">
            <div className="flex items-start gap-2.5">
              <Chip icon={WarningIcon} tone="warn" duotone />
              <div className="flex flex-col gap-1">
                <p className="m-0 text-body font-medium">Deux mots de passe pour cette entrée.</p>
                <p className="m-0 text-caption text-muted">
                  La rotation n'a pas pu être annulée : le site a peut-être pris le nouveau, peut
                  être gardé l'ancien. Essaie de te connecter, puis dis lequel marche. L'autre sera
                  jeté.
                </p>
              </div>
            </div>
            <div className="flex flex-col gap-2">
              <div className="flex items-center justify-between gap-2 rounded-control border border-line px-3.5 py-2.5">
                <div className="flex min-w-0 flex-col">
                  <span className="text-caption text-muted">Celui du coffre</span>
                  <span className="truncate font-mono text-body">{data.password}</span>
                </div>
                <Button
                  variant="secondary"
                  busy={busy}
                  onClick={() => void decide("current")}
                  className="shrink-0"
                >
                  Garder
                </Button>
              </div>
              <div className="flex items-center justify-between gap-2 rounded-control border border-line px-3.5 py-2.5">
                <div className="flex min-w-0 flex-col">
                  <span className="text-caption text-muted">Celui que l'agent a posé</span>
                  <span className="truncate font-mono text-body">{pending.password}</span>
                </div>
                <Button busy={busy} onClick={() => void decide("pending")} className="shrink-0">
                  Garder
                </Button>
              </div>
            </div>
          </Card>
        ) : null}

        <Note tone={agentZone ? "accent" : "neutral"} icon={agentZone ? RobotIcon : LockSimpleIcon}>
          {agentZone
            ? "Le serveur peut déchiffrer cette entrée pour la surveiller et changer son mot de passe."
            : "Cette entrée n'est lisible que sur tes appareils déverrouillés. L'agent peut seulement te prévenir."}
        </Note>

        <Card padded={false}>
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
              // Masked: one plain run of dots, never grouped. A bank-card rhythm on a
              // password suggests a length and a shape it does not have.
              value={revealed ? data.password : "••••••••••••••••"}
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
            <div className="flex min-h-[60px] items-center justify-between gap-2 px-4 py-2 [&+&]:border-t [&+&]:border-line">
              <span className="text-caption text-muted">Code à usage unique</span>
              <TotpCode value={data.totp} />
            </div>
          ) : null}
          {data.notes ? <FieldRow label="Notes" value={data.notes} mono={false} /> : null}
        </Card>

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
            className="text-left"
            onClick={() => {
              setPolicyOpen(true);
            }}
          >
            <Card className="flex items-center gap-3 transition-colors duration-150 hover:bg-raised">
              <Chip icon={ArrowsClockwiseIcon} tone="accent" />
              <span className="flex flex-1 flex-col">
                <span className="text-body font-medium">{rotationTitle}</span>
                <span className="text-caption text-muted">
                  {policy?.frequency_days
                    ? `Tous les ${String(policy.frequency_days)} jours · ${agentZone ? (policy.mode === "autonomous" ? "sans te demander" : "avec ta validation") : "rappel seulement"}`
                    : agentZone
                      ? "Régler la fréquence de rotation"
                      : "Régler un rappel de changement"}
                </span>
              </span>
              <CaretDownIcon size={20} className="text-muted" aria-hidden="true" />
            </Card>
          </button>
        )}

        <div className="flex min-h-11 items-center justify-between gap-3 px-1 text-caption">
          <span className="text-muted">Modifié {relative(item.updated_at)}</span>
          <button
            type="button"
            className="flex min-h-11 items-center gap-1.5 text-accent"
            aria-expanded={past !== null}
            onClick={() => void showHistory()}
          >
            <ClockCounterClockwiseIcon size={18} aria-hidden="true" />
            Historique
          </button>
        </div>
        {past ? (
          <Card padded={false}>
            {past.length === 0 ? (
              <p className="m-0 px-4 py-3 text-caption text-muted">
                Aucune version précédente : ce mot de passe n'a jamais changé ici.
              </p>
            ) : (
              <>
                {past.map((h, i) => (
                  <div
                    key={h.revision}
                    className={`flex min-h-11 items-center justify-between px-4 py-2 text-caption ${i ? "border-t border-line" : ""}`}
                  >
                    <span>Révision {h.revision}</span>
                    <span className="text-muted">{relative(h.created_at)}</span>
                  </div>
                ))}
                <p className="m-0 border-t border-line px-4 py-2.5 text-caption text-muted">
                  {plural(past.length, "version gardée", "versions gardées")} : une rotation ratée
                  peut être annulée.
                </p>
              </>
            )}
          </Card>
        ) : null}
      </Modal>

      <Confirm
        open={confirmMove}
        busy={busy}
        icon={agentZone ? LockSimpleIcon : RobotIcon}
        tone={agentZone ? "warn" : "accent"}
        title={agentZone ? "Reprendre cette entrée ?" : "Confier cette entrée à l'agent ?"}
        explanation={
          agentZone
            ? "Elle repassera dans ta zone personnelle et l'agent ne pourra plus la lire. Change ensuite ce mot de passe : le serveur l'a connu."
            : // A second factor stored here is a second factor the server can produce: it has to
              // be said before the move, not discovered after.
              `Le serveur pourra la déchiffrer pour surveiller les fuites et changer son mot de passe.${
                data.totp
                  ? " Il pourra aussi calculer son code à deux facteurs, ce dont l'agent a besoin pour se reconnecter."
                  : ""
              } Tu peux la reprendre à tout moment.`
        }
        confirmLabel={agentZone ? "Reprendre" : "Confier"}
        onCancel={() => {
          setConfirmMove(false);
        }}
        onConfirm={() => void move()}
      />
      <Confirm
        open={confirmDelete}
        busy={busy}
        icon={TrashIcon}
        title={`Supprimer ${data.name} ?`}
        explanation="L'entrée part à la corbeille et sera effacée définitivement dans 30 jours. Tu peux la restaurer d'ici là."
        confirmLabel="Supprimer"
        onCancel={() => {
          setConfirmDelete(false);
        }}
        onConfirm={() => void remove()}
      />

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
