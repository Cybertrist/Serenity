/**
 * The mood of the app: the colour of the light behind it (theme.css, `data-mood` on <html>).
 *
 * - calm: blue, nothing to do (the default)
 * - leak: amber, something leaked or needs attention
 * - agent: violet-blue, the agent is working (a rotation running or waiting for you)
 * - off: grey, the agent is stopped (kill switch)
 *
 * The shell sets a base mood from the state of the vault; a screen that knows better calls
 * `useMood()` while it is mounted, and the most recent screen wins.
 */
import { useEffect } from "react";

export type Mood = "calm" | "leak" | "agent" | "off";

let base: Mood = "calm";
const stack: { id: number; mood: Mood }[] = [];
let next = 0;

function apply(): void {
  if (typeof document === "undefined") return;
  document.documentElement.dataset.mood = stack[stack.length - 1]?.mood ?? base;
}

/** The mood when no screen asks for one. Called by the shell. */
export function setBaseMood(mood: Mood): void {
  base = mood;
  apply();
}

/** Back to calm, and forget every request: used when the vault locks. */
export function resetMood(): void {
  base = "calm";
  stack.length = 0;
  apply();
}

/**
 * Asks for a mood while the calling component is mounted. `null` asks for nothing (the base
 * mood, or the one of another screen, shows through).
 */
export function useMood(mood: Mood | null | undefined): void {
  useEffect(() => {
    if (!mood) return;
    next += 1;
    const id = next;
    stack.push({ id, mood });
    apply();
    return () => {
      const at = stack.findIndex((m) => m.id === id);
      if (at !== -1) stack.splice(at, 1);
      apply();
    };
  }, [mood]);
}
