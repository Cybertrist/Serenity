/** Wording shared by the entry screens (docs/crypto.md §7).
 *  The screens themselves live in `LockScene` and the `term/` panel. */

/** Master password quality hint, from length alone (the strength rules live in the watch). */
export function passwordHint(password: string): string {
  const n = Array.from(password.normalize("NFKC")).length;
  if (n === 0) return "12 caractères au moins. Une phrase de 4 ou 5 mots est idéale.";
  if (n < 12) return `Encore ${String(12 - n)} caractère(s) au moins.`;
  if (n < 16) return "Correct. Plus long, c'est encore mieux.";
  return "Solide.";
}

export function errorText(e: unknown): string {
  if (e instanceof Error && "status" in e) {
    const status = (e as { status: number }).status;
    const detail = (e as unknown as { detail?: string }).detail;
    if (status === 429) return "Trop de tentatives. Patiente un peu avant de réessayer.";
    if (status === 401) return detail ?? "Identifiants incorrects.";
    return detail ?? "Une erreur est survenue.";
  }
  if (e instanceof TypeError) return "Serveur injoignable. Vérifie ta connexion au serveur.";
  return e instanceof Error ? e.message : "Une erreur est survenue.";
}
