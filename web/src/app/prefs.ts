/** Per-device preferences (never secret): stored in localStorage, with safe fallbacks. */

const LOCK_KEY = "serenity.lockMinutes";
export const LOCK_CHOICES = [5, 15, 30] as const;

export function lockMinutes(): number {
  try {
    const value = Number(localStorage.getItem(LOCK_KEY));
    return (LOCK_CHOICES as readonly number[]).includes(value) ? value : 15;
  } catch {
    return 15;
  }
}

export function setLockMinutes(value: number): void {
  try {
    localStorage.setItem(LOCK_KEY, String(value));
  } catch {
    // Storage disabled: keep the default.
  }
}
