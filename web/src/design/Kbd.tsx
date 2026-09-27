import type { ReactNode } from "react";

/** macOS shows the command key; everything else (Windows, Linux, the web) says Ctrl. */
const MAC = typeof navigator !== "undefined" && /Mac OS X|iPhone|iPad/.test(navigator.userAgent);

const NAMES: Record<string, string> = {
  mod: MAC ? "⌘" : "Ctrl",
  ctrl: "Ctrl",
  meta: MAC ? "⌘" : "Win",
  shift: "Maj",
  alt: MAC ? "⌥" : "Alt",
  enter: "Entrée",
  escape: "Échap",
  esc: "Échap",
  space: "Espace",
  tab: "Tab",
  backspace: "Retour",
  arrowup: "↑",
  arrowdown: "↓",
  arrowleft: "←",
  arrowright: "→",
};

/**
 * The keys of a shortcut, as they are written on a keyboard: "mod+k" gives Ctrl K, "g v" (a
 * sequence) gives G V. The same syntax as the shortcut registry (web/src/app/shortcuts.ts).
 */
export function keyLabels(keys: string): string[] {
  return keys
    .trim()
    .split(/\s+/)
    .flatMap((step) => step.split("+"))
    .filter(Boolean)
    .map((key) => NAMES[key.toLowerCase()] ?? (key.length === 1 ? key.toUpperCase() : key));
}

/** Readable text for a title or an aria-label: "Ctrl K". */
export function keyText(keys: string): string {
  return keyLabels(keys).join(" ");
}

const CAP =
  "inline-flex h-[19px] min-w-[19px] items-center justify-center rounded-[5px] border border-line-strong bg-hover px-[5px] font-mono text-[11px] font-medium leading-none text-faint";

/**
 * A key of the keyboard, drawn as a cap. `keys` spells a whole shortcut ("mod+shift+k");
 * children draw one cap with any text ("Entrée"). `onAccent` suits a primary button.
 */
export function Kbd({
  keys,
  children,
  onAccent = false,
  className = "",
}: {
  keys?: string;
  children?: ReactNode;
  onAccent?: boolean;
  className?: string;
}) {
  const tone = onAccent ? "!border-white/25 !bg-white/10 !text-white/85" : "";
  if (children !== undefined)
    return <kbd className={`${CAP} ${tone} ${className}`}>{children}</kbd>;
  const labels = keyLabels(keys ?? "");
  return (
    <span className={`inline-flex items-center gap-[3px] ${className}`} aria-hidden="true">
      {labels.map((label, i) => (
        <kbd key={`${label}-${String(i)}`} className={`${CAP} ${tone}`}>
          {label}
        </kbd>
      ))}
    </span>
  );
}
