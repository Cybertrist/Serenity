/**
 * Light or dark, as a per-device preference (docs/design.md). The choice is kept in
 * localStorage — it is a taste, never a secret — and applied to `<html data-theme>`, which
 * is what `theme.css` reacts to. "system" follows the operating system, live.
 */
import { useSyncExternalStore } from "react";

export type ThemeChoice = "system" | "light" | "dark";
export type Theme = "light" | "dark";

const KEY = "serenity.theme";
const CHOICES: readonly ThemeChoice[] = ["system", "light", "dark"];
/** The browser bar, so the phone chrome does not stay black over a light app. */
const BAR: Record<Theme, string> = { dark: "#141517", light: "#eceae6" };

const listeners = new Set<() => void>();
let resolved: Theme = "dark";

export function themeChoice(): ThemeChoice {
  try {
    const value = localStorage.getItem(KEY);
    return CHOICES.includes(value as ThemeChoice) ? (value as ThemeChoice) : "system";
  } catch {
    return "system";
  }
}

export function setThemeChoice(choice: ThemeChoice): void {
  try {
    localStorage.setItem(KEY, choice);
  } catch {
    // Storage disabled: the choice holds for this session only.
  }
  applyTheme(choice);
}

function systemTheme(): Theme {
  return window.matchMedia("(prefers-color-scheme: light)").matches ? "light" : "dark";
}

export function resolveTheme(choice: ThemeChoice = themeChoice()): Theme {
  return choice === "system" ? systemTheme() : choice;
}

/** Dress the document. Returns what was applied, so a caller can log or test it. */
export function applyTheme(choice: ThemeChoice = themeChoice()): Theme {
  const theme = resolveTheme(choice);
  document.documentElement.dataset.theme = theme;
  document
    .querySelectorAll<HTMLMetaElement>('meta[name="theme-color"]')
    .forEach((meta) => (meta.content = BAR[theme]));
  if (theme !== resolved) {
    resolved = theme;
    listeners.forEach((listener) => {
      listener();
    });
  }
  return theme;
}

/** Called once at boot: applies the preference and follows the system while it is "system". */
export function startTheme(): void {
  applyTheme();
  window.matchMedia("(prefers-color-scheme: light)").addEventListener("change", () => {
    if (themeChoice() === "system") applyTheme("system");
  });
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

/** For the few pieces that cannot be expressed as tokens (the wordmark image). */
export function useTheme(): Theme {
  // Server snapshot: there is no prerender, but the signature asks for one.
  const dark = (): Theme => "dark";
  return useSyncExternalStore(subscribe, () => resolved, dark);
}
