/** Keys of an unlocked vault. They live in memory only and are wiped on lock. */
import { lib } from "../crypto/sodium";

export class Keyring {
  private wiped = false;

  constructor(
    readonly userId: string,
    private readonly uk: Uint8Array,
    readonly akVersion: number,
    private readonly ak: Uint8Array,
  ) {}

  /** User key: personal zone. */
  userKey(): Uint8Array {
    this.assertAlive();
    return this.uk;
  }

  /** Agent key: agent zone. */
  agentKey(): Uint8Array {
    this.assertAlive();
    return this.ak;
  }

  get isWiped(): boolean {
    return this.wiped;
  }

  /** Overwrite the key bytes. Best effort: JavaScript may have copied them elsewhere. */
  wipe(): void {
    const s = lib();
    s.memzero(this.uk);
    s.memzero(this.ak);
    this.wiped = true;
  }

  private assertAlive(): void {
    if (this.wiped) throw new Error("vault is locked");
  }
}
