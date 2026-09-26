/**
 * Automatic lock after inactivity (15 min by default) and when the page is hidden for good.
 * The keys only live in memory: closing the tab erases them anyway.
 *
 * The lock keeps a deadline on the wall clock. Timers alone are not enough: a background tab
 * throttles them and a sleeping laptop freezes them, so a machine that wakes up two hours later
 * would still show an open vault until the old timer finally fires. The deadline is checked on
 * every return to the page (visibility, focus, pageshow) and by a short interval.
 */

export const DEFAULT_IDLE_MS = 15 * 60 * 1000;
/** How often the deadline is checked, whatever the timers of the tab are doing. */
export const CHECK_EVERY_MS = 15_000;

export interface Timers {
  set(callback: () => void, ms: number): unknown;
  clear(handle: unknown): void;
  every(callback: () => void, ms: number): unknown;
  clearEvery(handle: unknown): void;
  now(): number;
}

const realTimers: Timers = {
  set: (callback, ms) => setTimeout(callback, ms),
  clear: (handle) => {
    clearTimeout(handle as ReturnType<typeof setTimeout>);
  },
  every: (callback, ms) => setInterval(callback, ms),
  clearEvery: (handle) => {
    clearInterval(handle as ReturnType<typeof setInterval>);
  },
  now: () => Date.now(),
};

const ACTIVITY_EVENTS = ["pointerdown", "keydown", "scroll", "touchstart"] as const;
/** Events that mean "the user is back": the deadline may have passed meanwhile. */
const RETURN_EVENTS = ["visibilitychange", "focus", "pageshow"] as const;

export class AutoLock {
  private handle: unknown = null;
  private ticker: unknown = null;
  private deadline = 0;
  private running = false;

  constructor(
    private readonly onLock: () => void,
    private idleMs = DEFAULT_IDLE_MS,
    private readonly timers: Timers = realTimers,
  ) {}

  get isRunning(): boolean {
    return this.running;
  }

  /** Starts (or restarts) the guard, optionally with a new idle delay. */
  start(idleMs?: number): void {
    if (idleMs !== undefined) this.idleMs = idleMs;
    this.stop();
    this.running = true;
    this.ticker = this.timers.every(
      () => {
        this.check();
      },
      Math.min(CHECK_EVERY_MS, this.idleMs),
    );
    this.deadline = this.timers.now() + this.idleMs;
    this.arm();
  }

  stop(): void {
    this.running = false;
    if (this.handle !== null) this.timers.clear(this.handle);
    if (this.ticker !== null) this.timers.clearEvery(this.ticker);
    this.handle = null;
    this.ticker = null;
  }

  /** Any user interaction pushes the lock back, unless the deadline is already behind us. */
  activity(): void {
    if (!this.running || this.check()) return;
    this.deadline = this.timers.now() + this.idleMs;
    this.arm();
  }

  /** Locks right away when the deadline has passed. Returns true when it locked. */
  check(): boolean {
    if (!this.running) return false;
    if (this.timers.now() < this.deadline) return false;
    this.lockNow();
    return true;
  }

  lockNow(): void {
    if (!this.running) return;
    this.stop();
    this.onLock();
  }

  private arm(): void {
    if (this.handle !== null) this.timers.clear(this.handle);
    this.handle = this.timers.set(
      () => {
        this.handle = null;
        // A timer may fire early or late: the deadline decides, and a late one re-arms.
        if (!this.check() && this.running) this.arm();
      },
      Math.max(0, this.deadline - this.timers.now()),
    );
  }

  /**
   * Wire the browser events. Returns a function that removes them. The listeners only call this
   * object, so attaching once is enough, however many times the guard is restarted.
   */
  attach(target: Window): () => void {
    const onActivity = (): void => {
      this.activity();
    };
    const onReturn = (): void => {
      this.check();
    };
    const onPageHide = (): void => {
      this.lockNow();
    };
    // visibilitychange is fired at the document; it bubbles up to the window in browsers, but
    // listening on the document too costs nothing and a double check is harmless.
    const doc = (target as Partial<Window>).document;
    for (const name of ACTIVITY_EVENTS)
      target.addEventListener(name, onActivity, { passive: true });
    for (const name of RETURN_EVENTS) target.addEventListener(name, onReturn);
    doc?.addEventListener("visibilitychange", onReturn);
    target.addEventListener("pagehide", onPageHide);
    return () => {
      for (const name of ACTIVITY_EVENTS) target.removeEventListener(name, onActivity);
      for (const name of RETURN_EVENTS) target.removeEventListener(name, onReturn);
      doc?.removeEventListener("visibilitychange", onReturn);
      target.removeEventListener("pagehide", onPageHide);
    };
  }
}
