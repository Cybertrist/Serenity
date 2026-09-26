import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

describe("clipboard", () => {
  let writes: string[];
  let refuse: boolean;
  let target: EventTarget;

  beforeEach(() => {
    vi.resetModules();
    vi.useFakeTimers();
    writes = [];
    refuse = false;
    target = new EventTarget();
    vi.stubGlobal("window", target);
    vi.stubGlobal("navigator", {
      clipboard: {
        writeText: (value: string) => {
          if (refuse && value === "") return Promise.reject(new Error("Document is not focused."));
          writes.push(value);
          return Promise.resolve();
        },
      },
    });
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  it("clears after 30 seconds", async () => {
    const { copySecret, CLEAR_AFTER_MS } = await import("./clipboard");
    await copySecret("secret");
    await vi.advanceTimersByTimeAsync(CLEAR_AFTER_MS);
    expect(writes).toEqual(["secret", ""]);
  });

  it("retries on focus when the page had no focus", async () => {
    const { copySecret, CLEAR_AFTER_MS } = await import("./clipboard");
    await copySecret("secret");
    refuse = true;
    await vi.advanceTimersByTimeAsync(CLEAR_AFTER_MS);
    expect(writes).toEqual(["secret"]);
    refuse = false;
    target.dispatchEvent(new Event("focus"));
    await vi.advanceTimersByTimeAsync(0);
    expect(writes).toEqual(["secret", ""]);
  });

  it("clears right away on lock, then leaves the clipboard alone", async () => {
    const { clearClipboard, copySecret, CLEAR_AFTER_MS } = await import("./clipboard");
    await copySecret("secret");
    await clearClipboard();
    expect(writes).toEqual(["secret", ""]);
    await clearClipboard();
    await vi.advanceTimersByTimeAsync(CLEAR_AFTER_MS);
    expect(writes).toEqual(["secret", ""]);
  });

  it("clears on pagehide", async () => {
    const { copySecret } = await import("./clipboard");
    await copySecret("secret");
    target.dispatchEvent(new Event("pagehide"));
    await vi.advanceTimersByTimeAsync(0);
    expect(writes).toEqual(["secret", ""]);
  });
});
