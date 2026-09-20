/** Copy, then clear the clipboard after 30 s (other apps can read it meanwhile). */
export const CLEAR_AFTER_MS = 30_000;
let timer: ReturnType<typeof setTimeout> | null = null;

export async function copySecret(value: string): Promise<void> {
  await navigator.clipboard.writeText(value);
  if (timer) clearTimeout(timer);
  timer = setTimeout(() => {
    void navigator.clipboard.writeText("").catch(() => undefined);
    timer = null;
  }, CLEAR_AFTER_MS);
}
