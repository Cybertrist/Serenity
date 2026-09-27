import { PasswordIcon, SignOutIcon } from "@phosphor-icons/react";
import { useQueryClient } from "@tanstack/react-query";
import { useState, type FormEvent } from "react";
import { useSession } from "../../../app/session";
import { useToast } from "../../../app/toast";
import { Button, Confirm, ErrorNote, Field, Glass, Pill } from "../../../design";
import { CodeField } from "../CodeField";
import { changePassword } from "../credentials";
import { errorText, passwordHint } from "../screens/wording";
import { Group } from "./parts";

/** Who is here, the master password, and leaving this device. */
export function AccountSection() {
  const session = useSession();
  const toast = useToast();
  const queryClient = useQueryClient();
  const [pw, setPw] = useState({ current: "", next: "", confirm: "", code: "" });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [leaving, setLeaving] = useState(false);

  const submit = (event: FormEvent) => {
    event.preventDefault();
    if (pw.next !== pw.confirm) {
      setError("Les deux nouveaux mots de passe diffèrent.");
      return;
    }
    void (async () => {
      setBusy(true);
      setError(null);
      try {
        if (!session.keyring || !session.username) return;
        await changePassword(
          session.api,
          session.keyring,
          session.username,
          pw.current,
          pw.next,
          pw.code,
        );
        // The offline copy is sealed with the old password: it follows the new one.
        await session.refreshKeysCache();
        setPw({ current: "", next: "", confirm: "", code: "" });
        await queryClient.invalidateQueries({ queryKey: ["sessions"] });
        toast("Mot de passe maître changé. Tes autres appareils sont déconnectés.");
      } catch (e) {
        setError(errorText(e));
      } finally {
        setBusy(false);
      }
    })();
  };

  const name = session.username ?? "";
  const host = typeof location !== "undefined" ? location.host : "";
  return (
    <>
      <Glass as="section" className="flex items-center gap-3.5 px-4 py-4 @[620px]:px-5">
        <Avatar name={name} size={46} />
        <div className="flex min-w-0 flex-1 flex-col gap-0.5">
          <p className="m-0 truncate text-[15px] font-semibold leading-tight">{name}</p>
          <p className="m-0 truncate text-caption text-muted">{host}</p>
        </div>
        {session.offline ? <Pill>Hors ligne</Pill> : <Pill tone="ok">Connecté</Pill>}
      </Glass>

      <Group
        title="Mot de passe maître"
        text="Tes entrées ne bougent pas : seule la clé qui les protège est rechiffrée, ici, sur cet appareil. Tes autres appareils seront déconnectés."
      >
        {error ? <ErrorNote>{error}</ErrorNote> : null}
        <form className="flex flex-col gap-3.5" onSubmit={submit}>
          <Field
            label="Actuel"
            secret
            value={pw.current}
            onChange={(e) => {
              setPw({ ...pw, current: e.target.value });
            }}
            autoComplete="current-password"
            required
          />
          <div className="grid grid-cols-1 gap-3.5 @[760px]:grid-cols-2">
            <Field
              label="Nouveau"
              secret
              hint={passwordHint(pw.next)}
              value={pw.next}
              onChange={(e) => {
                setPw({ ...pw, next: e.target.value });
              }}
              autoComplete="new-password"
              minLength={12}
              required
            />
            <Field
              label="Confirme le nouveau"
              secret
              value={pw.confirm}
              onChange={(e) => {
                setPw({ ...pw, confirm: e.target.value });
              }}
              autoComplete="new-password"
              required
            />
          </div>
          <CodeField
            label="Code à 6 chiffres"
            hint="Le code de ton appli d'authentification, pour prouver que c'est bien toi."
            value={pw.code}
            onChange={(e) => {
              setPw({ ...pw, code: e.target.value.replace(/\D/g, "") });
            }}
          />
          <div>
            <Button
              type="submit"
              variant="secondary"
              icon={PasswordIcon}
              busy={busy}
              disabled={!pw.current || !pw.next || !pw.confirm || pw.code.length !== 6}
            >
              Changer le mot de passe maître
            </Button>
          </div>
        </form>
      </Group>

      <Group
        title="Déconnexion"
        text="Efface les clés et le cache hors ligne de cet appareil. Ton coffre reste intact sur le serveur."
      >
        <div>
          <Button
            variant="danger"
            icon={SignOutIcon}
            onClick={() => {
              setLeaving(true);
            }}
          >
            Se déconnecter de cet appareil
          </Button>
        </div>
      </Group>

      <Confirm
        open={leaving}
        icon={SignOutIcon}
        title="Se déconnecter ?"
        explanation="Cet appareil oubliera ses clés et son cache hors ligne. Il faudra ton mot de passe maître et un code à 6 chiffres pour revenir."
        confirmLabel="Se déconnecter"
        onCancel={() => {
          setLeaving(false);
        }}
        onConfirm={() => {
          setLeaving(false);
          void session.logout();
        }}
      />
    </>
  );
}

/** The first letter of the account on the blue of the brand, as in the sidebar. */
export function Avatar({ name, size = 28 }: { name: string; size?: number }) {
  return (
    <span
      aria-hidden="true"
      className="grid shrink-0 place-items-center rounded-full bg-linear-to-br from-[#3b82f6] to-[#1e3a8a] font-display font-bold text-white shadow-[0_8px_20px_-10px_rgb(59_130_246/0.8)]"
      style={{ width: size, height: size, fontSize: Math.round(size * 0.42) }}
    >
      {(name[0] ?? "?").toUpperCase()}
    </span>
  );
}
