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

  it("does nothing on pagehide when it is not running", () => {
    const onLock = vi.fn();
    const lock = new AutoLock(onLock, 1000);
    const target = new EventTarget() as unknown as Window;
    const detach = lock.attach(target);
    target.dispatchEvent(new Event("pagehide"));
    expect(onLock).not.toHaveBeenCalled();
    detach();
  });

  it("locks on return when the deadline passed while timers were frozen", () => {
    const onLock = vi.fn();
    const lock = new AutoLock(onLock, 1000);
    const target = new EventTarget() as unknown as Window;
    const detach = lock.attach(target);
    lock.start();
    // The machine sleeps: the clock moves, no timer fires.
    vi.setSystemTime(Date.now() + 5000);
    expect(onLock).not.toHaveBeenCalled();
    target.dispatchEvent(new Event("visibilitychange"));
    expect(onLock).toHaveBeenCalledOnce();
    detach();
  });

  it("activity after the deadline locks instead of pushing back", () => {
    const onLock = vi.fn();
    const lock = new AutoLock(onLock, 1000);
    lock.start();
    vi.setSystemTime(Date.now() + 5000);
    lock.activity();
    expect(onLock).toHaveBeenCalledOnce();
  });

  it("keeps listening after a restart", () => {
    const onLock = vi.fn();
    const lock = new AutoLock(onLock, 1000);
    const target = new EventTarget() as unknown as Window;
    const detach = lock.attach(target);
    lock.start();
    lock.start(2000);
    vi.advanceTimersByTime(1500);
    target.dispatchEvent(new Event("keydown"));
    vi.advanceTimersByTime(1500);
    expect(onLock).not.toHaveBeenCalled();
    vi.advanceTimersByTime(500);
    expect(onLock).toHaveBeenCalledOnce();
    detach();
  });
});
