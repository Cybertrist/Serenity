/**
 * Password rules shared with the server (api/serenity/watcher/rules.py), checked against
 * shared/test-vectors/watch.json.
 */

export const MIN_LENGTH = 12;
export const MIN_BITS = 60;
export const MIN_DISTINCT = 5;
export const OLD_AFTER_DAYS = 365;

const POOLS: [RegExp, number][] = [
  [/[a-z]/, 26],
  [/[A-Z]/, 26],
  [/[0-9]/, 10],
  [/[^a-zA-Z0-9]/, 33],
];

/** Code points, like Python len(). */
function length(text: string): number {
  return Array.from(text).length;
}

export function strengthBits(password: string): number {
  const pool = POOLS.reduce(
    (sum, [pattern, size]) => (pattern.test(password) ? sum + size : sum),
    0,
  );
  return pool ? length(password) * Math.log2(pool) : 0;
}

export function isWeak(password: string): boolean {
  if (!password) return false;
  return (
    length(password) < MIN_LENGTH ||
    strengthBits(password) < MIN_BITS ||
    new Set(Array.from(password)).size < MIN_DISTINCT
  );
}

export function isOld(changedAt: Date | null, now: Date): boolean {
  return changedAt !== null && now.getTime() - changedAt.getTime() > OLD_AFTER_DAYS * 86_400_000;
}

export function parseDate(value: unknown): Date | null {
  if (typeof value !== "string" || !value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}
