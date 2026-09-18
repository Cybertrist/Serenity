import type { Icon } from "@phosphor-icons/react";
import { motion } from "motion/react";
import type { ReactNode } from "react";
import { EASE } from "../../../design";

export function AuthLayout({
  icon: IconComponent,
  title,
  subtitle,
  step,
  children,
  footer,
}: {
  icon: Icon;
  title: string;
  subtitle: string;
  step?: { current: number; total: number; label: string };
  children: ReactNode;
  footer?: ReactNode;
}) {
  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-[480px] flex-col gap-8 px-6 pb-8 pt-6">
      <div className="flex min-h-11 items-center justify-between">
        <div className="flex items-center gap-2 text-body font-semibold">
          <span aria-hidden="true" className="h-2.5 w-2.5 rounded-full bg-accent" />
          Serenity
        </div>
        {step ? (
          <div className="flex items-center gap-3">
            <span className="text-caption text-muted">{step.label}</span>
            <span
              className="flex gap-1.5"
              aria-label={`Étape ${String(step.current)} sur ${String(step.total)}`}
            >
              {Array.from({ length: step.total }, (_, i) => (
                <span
                  key={i}
                  className={`h-1 w-5 rounded-full ${i < step.current ? "bg-accent" : "bg-raised"}`}
                />
              ))}
            </span>
          </div>
        ) : null}
      </div>
      <motion.div
        className="flex flex-1 flex-col justify-center gap-7"
        initial={{ opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        transition={EASE}
      >
        <div className="flex h-[88px] w-[88px] items-center justify-center rounded-[28px] bg-accent-soft text-accent">
          <IconComponent size={48} weight="duotone" aria-hidden="true" />
        </div>
        <div className="flex flex-col gap-1.5">
          <h1 className="m-0 text-title">{title}</h1>
          <p className="m-0 text-body text-muted">{subtitle}</p>
        </div>
        {children}
      </motion.div>
      {footer ? (
        <div className="flex flex-col items-center gap-3 text-caption">{footer}</div>
      ) : null}
    </main>
  );
}

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
  if (e instanceof TypeError) return "Serveur injoignable. Vérifie ta connexion au tailnet.";
  return e instanceof Error ? e.message : "Une erreur est survenue.";
}
