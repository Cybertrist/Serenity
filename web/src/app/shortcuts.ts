/**
 * Keyboard shortcuts, one registry for the whole app.
 *
 * Syntax (the same one `<Kbd keys>` draws): modifiers joined with "+", then the key, lower
 * case: "mod+k" (Ctrl, or Cmd on a Mac), "mod+shift+k", "/", "escape". A space makes a
 * sequence: "g v" is G, then V within a second.
 *
 * The most recent registration of a combination wins, so a screen can take over a key the
 * shell also uses ("/" opens the palette, unless the vault registers it to focus its search).
 * Plain keys are ignored while typing in a field; combinations with mod are not. While a
 * dialog is open, only shortcuts marked `inDialog` answer.
 */
import { useEffect, useRef } from "react";

export interface ShortcutOptions {
  enabled?: boolean;
  /** Also fire while the focus is in a text field (default: only for mod combinations). */
  inInput?: boolean;
  /** Also fire while a dialog is open (default: no). */
  inDialog?: boolean;
}

interface Binding {
  id: number;
  keys: string;
  run: (event: KeyboardEvent) => void;
  inInput: boolean;
  inDialog: boolean;
}

const MAC = typeof navigator !== "undefined" && /Mac OS X|iPhone|iPad/.test(navigator.userAgent);
const SEQUENCE_MS = 1200;

const bindings: Binding[] = [];
let counter = 0;
let pending: string | null = null;
let pendingTimer: ReturnType<typeof setTimeout> | null = null;
let listening = false;

/** "Mod+Shift+K" and "shift+mod+k" are the same shortcut. */
export function normalise(keys: string): string {
  return keys
    .trim()
    .toLowerCase()
    .split(/\s+/)
    .map((step) => {
      const parts = step.split("+");
      const key = parts.pop() ?? "";
      const mods = ["mod", "alt", "shift"].filter((m) => parts.includes(m));
      return [...mods, key].join("+");
    })
    .join(" ");
}

/** The combination a key event stands for, in the registry's syntax. */
export function comboOf(event: KeyboardEvent): string {
  const mods: string[] = [];
  if (MAC ? event.metaKey : event.ctrlKey) mods.push("mod");
  if (event.altKey) mods.push("alt");
  // Shift is part of what the key produces for symbols ("?" or "/"), not a modifier there.
  let key = event.key.toLowerCase();
  if (key === " ") key = "space";
  if (event.shiftKey && (key.length > 1 || /[a-z0-9]/.test(key))) mods.push("shift");
  return [...mods, key].join("+");
}

function typing(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  if (target.isContentEditable) return true;
  const tag = target.tagName;
  if (tag === "TEXTAREA" || tag === "SELECT") return true;
  if (tag !== "INPUT") return false;
  const type = (target as HTMLInputElement).type;
  return !["checkbox", "radio", "button", "submit", "range", "color"].includes(type);
}

function dialogOpen(): boolean {
  return document.querySelector('[aria-modal="true"]') !== null;
}

function find(keys: string, inField: boolean, inDialogNow: boolean): Binding | undefined {
  for (let i = bindings.length - 1; i >= 0; i -= 1) {
    const b = bindings[i];
    if (!b || b.keys !== keys) continue;
    if (inField && !b.inInput) continue;
    if (inDialogNow && !b.inDialog) continue;
    return b;
  }
  return undefined;
}

function clearPending(): void {
  pending = null;
  if (pendingTimer) clearTimeout(pendingTimer);
  pendingTimer = null;
}

function onKeyDown(event: KeyboardEvent): void {
  if (event.defaultPrevented || event.isComposing) return;
  if (["control", "shift", "alt", "meta"].includes(event.key.toLowerCase())) return;
  const combo = comboOf(event);
  const inField = typing(event.target);
  const inDialogNow = dialogOpen();

  if (pending) {
    const sequence = `${pending} ${combo}`;
    clearPending();
    const hit = find(sequence, inField, inDialogNow);
    if (hit) {
      event.preventDefault();
      hit.run(event);
      return;
    }
  }

  const hit = find(combo, inField, inDialogNow);
  if (hit) {
    event.preventDefault();
    hit.run(event);
    return;
  }

  // The first key of a sequence: wait for the second one.
  if (!inField && bindings.some((b) => b.keys.startsWith(`${combo} `))) {
    pending = combo;
    pendingTimer = setTimeout(clearPending, SEQUENCE_MS);
  }
}

function listen(): void {
  if (listening || typeof window === "undefined") return;
  listening = true;
  window.addEventListener("keydown", onKeyDown);
}

/** Registers a shortcut until the returned function is called. */
export function registerShortcut(
  keys: string | string[],
  run: (event: KeyboardEvent) => void,
  options: ShortcutOptions = {},
): () => void {
  listen();
  const all = Array.isArray(keys) ? keys : [keys];
  const added = all.map((k) => {
    counter += 1;
    const normal = normalise(k);
    const binding: Binding = {
      id: counter,
      keys: normal,
      run,
      inInput: options.inInput ?? normal.includes("mod+"),
      inDialog: options.inDialog ?? false,
    };
    bindings.push(binding);
    return binding.id;
  });
  return () => {
    for (const id of added) {
      const at = bindings.findIndex((b) => b.id === id);
      if (at !== -1) bindings.splice(at, 1);
    }
  };
}

/**
 * A shortcut for as long as the component is mounted. The handler may change on every render;
 * only `keys` and the options re-register it.
 */
export function useShortcut(
  keys: string | string[],
  run: (event: KeyboardEvent) => void,
  options: ShortcutOptions = {},
): void {
  const handler = useRef(run);
  handler.current = run;
  const { enabled = true, inInput, inDialog } = options;
  const id = Array.isArray(keys) ? keys.join("|") : keys;
  useEffect(() => {
    if (!enabled) return;
    return registerShortcut(
      id.split("|"),
      (event) => {
        handler.current(event);
      },
      {
        ...(inInput === undefined ? {} : { inInput }),
        ...(inDialog === undefined ? {} : { inDialog }),
      },
    );
  }, [id, enabled, inInput, inDialog]);
}
