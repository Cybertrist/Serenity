/** French wording and dates. Short sentences, informal "tu", reassuring (docs/design.md). */

const RTF = new Intl.RelativeTimeFormat("fr", { numeric: "auto" });
const DAY = 86_400_000;

export function relative(iso: string | null | undefined, now = Date.now()): string {
  if (!iso) return "jamais";
  const diff = new Date(iso).getTime() - now;
  const abs = Math.abs(diff);
  if (abs < 60_000) return "à l'instant";
  if (abs < 3_600_000) return RTF.format(Math.round(diff / 60_000), "minute");
  if (abs < DAY) return RTF.format(Math.round(diff / 3_600_000), "hour");
  if (abs < 60 * DAY) return RTF.format(Math.round(diff / DAY), "day");
  return RTF.format(Math.round(diff / (30 * DAY)), "month");
}

export function daysUntil(iso: string | null | undefined, now = Date.now()): number | null {
  if (!iso) return null;
  return Math.ceil((new Date(iso).getTime() - now) / DAY);
}

export function time(iso: string): string {
  return new Date(iso).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" });
}

export function dayLabel(iso: string, now = new Date()): string {
  const d = new Date(iso);
  const start = (x: Date) => new Date(x.getFullYear(), x.getMonth(), x.getDate()).getTime();
  const days = Math.round((start(now) - start(d)) / DAY);
  if (days === 0) return "Aujourd'hui";
  if (days === 1) return "Hier";
  return d.toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long" });
}

export function plural(n: number, one: string, many: string): string {
  return `${String(n)} ${n > 1 ? many : one}`;
}

export function domainOf(urls: unknown): string | null {
  if (!Array.isArray(urls)) return null;
  for (const url of urls) {
    if (typeof url !== "string" || !url) continue;
    try {
      return new URL(url.includes("://") ? url : `https://${url}`).hostname.replace(/^www\./, "");
    } catch {
      continue;
    }
  }
  return null;
}
