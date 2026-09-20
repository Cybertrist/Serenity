/** State colours of the charter: each tone has a colour and a soft background. */
export type Tone = "accent" | "ok" | "warn" | "crit" | "neutral";

export const TONE_TEXT: Record<Tone, string> = {
  accent: "text-accent",
  ok: "text-ok",
  warn: "text-warn",
  crit: "text-crit",
  neutral: "text-muted",
};

export const TONE_SOFT: Record<Tone, string> = {
  accent: "bg-accent-soft",
  ok: "bg-ok-soft",
  warn: "bg-warn-soft",
  crit: "bg-crit-soft",
  neutral: "bg-neutral-soft",
};
