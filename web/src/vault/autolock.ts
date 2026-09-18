/**
 * Automatic lock after inactivity (15 min by default) and when the page is hidden for good.
 * The keys only live in memory: closing the tab erases them anyway.
 */

export const DEFAULT_IDLE_MS = 15 * 60 * 1000;

export interface Timers {
  set(callback: () => void, ms: number): unknown;
  clear(handle: unknown): void;
}

const realTimers: Timers = {
  set: (callback, ms) => setTimeout(callback, ms),
  clear: (handle) => {
    clearTimeout(handle as ReturnType<typeof setTimeout>);
  },
};

const ACTIVITY_EVENTS = ["pointerdown", "keydown", "scroll", "touchstart"] as const;

export class AutoLock {
  private handle: unknown = null;
  private running = false;

  constructor(
    private readonly onLock: () => void,
    private readonly idleMs = DEFAULT_IDLE_MS,
    private readonly timers: Timers = realTimers,
  ) {}

  start(): void {
    this.running = true;
    this.activity();
  }

  stop(): void {
    this.running = false;
    if (this.handle !== null) this.timers.clear(this.handle);
    this.handle = null;
  }

  /** Any user interaction pushes the lock back. */
  activity(): void {
    if (!this.running) return;
    if (this.handle !== null) this.timers.clear(this.handle);
    this.handle = this.timers.set(() => {
      this.lockNow();
    }, this.idleMs);
  }

  lockNow(): void {
    this.stop();
    this.onLock();
  }

  /** Wire the browser events. Returns a function that removes them. */
  attach(target: Window): () => void {
    const onActivity = (): void => {
      this.activity();
    };
    const onPageHide = (): void => {
      this.lockNow();
    };
    for (const name of ACTIVITY_EVENTS)
      target.addEventListener(name, onActivity, { passive: true });
    target.addEventListener("pagehide", onPageHide);
    return () => {
      for (const name of ACTIVITY_EVENTS) target.removeEventListener(name, onActivity);
      target.removeEventListener("pagehide", onPageHide);
    };
  }
}
