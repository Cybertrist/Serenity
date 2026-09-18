import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { AutoLock } from "./autolock";

describe("AutoLock", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it("locks after 15 minutes without activity", () => {
    const onLock = vi.fn();
    new AutoLock(onLock).start();
    vi.advanceTimersByTime(15 * 60 * 1000 - 1);
    expect(onLock).not.toHaveBeenCalled();
    vi.advanceTimersByTime(1);
    expect(onLock).toHaveBeenCalledOnce();
  });

  it("activity pushes the lock back", () => {
    const onLock = vi.fn();
    const lock = new AutoLock(onLock, 1000);
    lock.start();
    vi.advanceTimersByTime(900);
    lock.activity();
    vi.advanceTimersByTime(900);
    expect(onLock).not.toHaveBeenCalled();
    vi.advanceTimersByTime(100);
    expect(onLock).toHaveBeenCalledOnce();
  });

  it("locks when the page goes away", () => {
    const onLock = vi.fn();
    const lock = new AutoLock(onLock, 1000);
    const target = new EventTarget() as unknown as Window;
    const detach = lock.attach(target);
    lock.start();
    target.dispatchEvent(new Event("pagehide"));
    expect(onLock).toHaveBeenCalledOnce();
    detach();
  });
});
