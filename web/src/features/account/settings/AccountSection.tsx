import { KeyIcon, SignOutIcon } from "@phosphor-icons/react";
import { useQueryClient } from "@tanstack/react-query";
import { useState, type FormEvent } from "react";
import { useSession } from "../../../app/session";
import { useToast } from "../../../app/toast";
import { Button, Confirm, ErrorNote, Field, Note } from "../../../design";
import { changePassword } from "../credentials";
import { errorText, passwordHint } from "../screens/wording";

/** Master password change and sign-out. Both end the sessions of the other devices. */
export function AccountSection({ onClose }: { onClose: () => void }) {
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

  return (
    <div className="flex flex-col gap-6">
      <section className="flex flex-col gap-4">
        <div className="flex flex-col gap-2">
          <p className="m-0 text-body font-medium">Mot de passe maître</p>
          <p className="m-0 text-caption text-muted">
            Tes entrées ne bougent pas : seule la clé qui les protège est re-chiffrée, ici, sur cet
            appareil. Tes autres appareils seront déconnectés.
          </p>
        </div>
        {error ? <ErrorNote>{error}</ErrorNote> : null}
        <form className="flex flex-col gap-3" onSubmit={submit}>
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
            required
          />
          <Field
            label="Code TOTP"
            hint="Le code de ton appli d'authentification, pour prouver que c'est bien toi."
            inputMode="numeric"
            maxLength={6}
            mono
            value={pw.code}
            onChange={(e) => {
              setPw({ ...pw, code: e.target.value.replace(/\D/g, "") });
            }}
            required
          />
          <Button type="submit" variant="secondary" busy={busy}>
            Changer le mot de passe maître
          </Button>
        </form>
      </section>

      <section className="flex flex-col gap-3">
        <div className="flex flex-col gap-2">
          <p className="m-0 text-body font-medium">Kit de récupération</p>
          <p className="m-0 text-caption text-muted">
            Affiché une seule fois, à la création du compte. Il ne peut pas être réaffiché : le
            serveur n'en garde aucune copie lisible.
          </p>
        </div>
        <Note icon={KeyIcon}>
          Kit perdu ? Passe par « Utiliser mon kit de récupération » sur l'écran de connexion tant
          que tu connais ton mot de passe maître : la récupération t'en donne un neuf et rend
          l'ancien inutilisable.
        </Note>
      </section>

      <section className="flex flex-col gap-3">
        <div className="flex flex-col gap-2">
          <p className="m-0 text-body font-medium">Déconnexion</p>
          <p className="m-0 text-caption text-muted">
            Efface les clés et le cache hors ligne de cet appareil. Ton coffre reste intact sur le
            serveur.
          </p>
        </div>
        <Button
          variant="danger"
          icon={SignOutIcon}
          onClick={() => {
            setLeaving(true);
          }}
        >
          Se déconnecter de cet appareil
        </Button>
      </section>

      <Confirm
        open={leaving}
        icon={SignOutIcon}
        title="Se déconnecter ?"
        explanation="Cet appareil oubliera ses clés et son cache hors ligne. Il faudra ton mot de passe maître et un code TOTP pour revenir."
        confirmLabel="Se déconnecter"
        onCancel={() => {
          setLeaving(false);
        }}
        onConfirm={() => {
          onClose();
          void session.logout();
        }}
      />
    </div>
  );
}
