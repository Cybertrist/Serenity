import { describe, expect, it } from "vitest";
import { comboOf, normalise } from "./shortcuts";

function key(k: string, mods: Partial<KeyboardEvent> = {}): KeyboardEvent {
  return {
    key: k,
    ctrlKey: false,
    metaKey: false,
    altKey: false,
    shiftKey: false,
    ...mods,
  } as KeyboardEvent;
}

describe("shortcuts", () => {
  it("normalises the order of modifiers and the case", () => {
    expect(normalise("Shift+Mod+K")).toBe("mod+shift+k");
    expect(normalise("g  v")).toBe("g v");
    expect(normalise("mod+,")).toBe("mod+,");
  });

  it("reads an event in the same syntax", () => {
    expect(comboOf(key("k", { ctrlKey: true }))).toBe("mod+k");
    expect(comboOf(key("K", { ctrlKey: true, shiftKey: true }))).toBe("mod+shift+k");
    // A slash typed with Shift (French keyboard) is still a slash.
    expect(comboOf(key("/", { shiftKey: true }))).toBe("/");
    expect(comboOf(key("Escape"))).toBe("escape");
  });
});
