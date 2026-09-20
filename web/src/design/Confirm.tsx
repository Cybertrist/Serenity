import type { Icon } from "@phosphor-icons/react";
import { Button } from "./Button";
import { Modal } from "./Modal";
import type { Tone } from "./tone";

/**
 * Small dialog for an action that cannot be undone: it always says what will happen,
 * in one sentence, before the button that does it.
 */
export function Confirm({
  open,
  onCancel,
  onConfirm,
  title,
  explanation,
  confirmLabel,
  icon,
  tone = "crit",
  busy = false,
}: {
  open: boolean;
  onCancel: () => void;
  onConfirm: () => void;
  title: string;
  explanation: string;
  confirmLabel: string;
  icon?: Icon;
  tone?: Tone;
  busy?: boolean;
}) {
  return (
    <Modal
      open={open}
      onClose={onCancel}
      title={title}
      size="sm"
      {...(icon ? { icon } : {})}
      tone={tone}
      footer={
        <div className="flex gap-2">
          <Button variant="secondary" className="flex-1" onClick={onCancel}>
            Annuler
          </Button>
          <Button
            variant={tone === "crit" ? "danger" : "primary"}
            className="flex-1"
            busy={busy}
            onClick={onConfirm}
          >
            {confirmLabel}
          </Button>
        </div>
      }
    >
      <p className="m-0 text-body text-muted">{explanation}</p>
    </Modal>
  );
}
