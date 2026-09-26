/**
 * Copy, then clear the clipboard after 30 s (other apps can read it meanwhile).
 *
 * Browsers refuse clipboard writes from a page without focus, and the 30 s often end while the
 * user is in another app. A failed clear is therefore kept pending and retried as soon as the
 * page gets focus back. The vault lock and pagehide clear it too.
 */
export const CLEAR_AFTER_MS = 30_000;

let timer: ReturnType<typeof setTimeout> | null = null;
/** A secret copied by us is (maybe) still in the clipboard. */
let pending = false;
let listening = false;

function onReturn(): void {
  if (typeof document !== "undefined" && document.visibilityState === "hidden") return;
  void clearClipboard();
}

function onPageHide(): void {
  void clearClipboard();
}

function listen(): void {
  if (listening || typeof window === "undefined") return;
  listening = true;
  window.addEventListener("focus", onReturn);
  window.addEventListener("visibilitychange", onReturn);
  window.addEventListener("pagehide", onPageHide);
}

function unlisten(): void {
  if (!listening || typeof window === "undefined") return;
  listening = false;
  window.removeEventListener("focus", onReturn);
  window.removeEventListener("visibilitychange", onReturn);
  window.removeEventListener("pagehide", onPageHide);
}

export async function copySecret(value: string): Promise<void> {
  await navigator.clipboard.writeText(value);
  pending = true;
  listen();
  if (timer) clearTimeout(timer);
  timer = setTimeout(() => {
    timer = null;
    void clearClipboard();
  }, CLEAR_AFTER_MS);
}

/**
 * Clears the clipboard if a secret copied here may still be in it. Safe to call anytime: it does
 * nothing when there is nothing of ours to clear. Called by the session when the vault locks.
 */
export async function clearClipboard(): Promise<void> {
  if (!pending) return;
  if (timer) {
    clearTimeout(timer);
    timer = null;
  }
  try {
    await navigator.clipboard.writeText("");
    pending = false;
    unlisten();
  } catch {
    // No focus: retried on the next focus or visibility change.
    listen();
  }
}
