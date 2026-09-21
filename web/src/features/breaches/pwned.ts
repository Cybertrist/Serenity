/**
 * Pwned Passwords range API with k-anonymity: only the first 5 hex characters of the SHA-1 leave
 * the browser. SHA-1 is imposed by the API (Web Crypto); it protects nothing here.
 */
import type { Fetch } from "../../lib/api";

export const PWNED_API = "https://api.pwnedpasswords.com/range/";

export async function sha1Hex(password: string): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-1", new TextEncoder().encode(password));
  return Array.from(new Uint8Array(digest), (b) => b.toString(16).padStart(2, "0"))
    .join("")
    .toUpperCase();
}

export class PwnedPasswords {
  private readonly cache = new Map<string, Promise<Map<string, number>>>();

  constructor(private readonly fetchImpl: Fetch = (input, init) => fetch(input, init)) {}

  private range(prefix: string): Promise<Map<string, number>> {
    let pending = this.cache.get(prefix);
    if (!pending) {
      pending = this.load(prefix);
      this.cache.set(prefix, pending);
    }
    return pending;
  }

  private async load(prefix: string): Promise<Map<string, number>> {
    const response = await this.fetchImpl(PWNED_API + prefix, {
      headers: { "Add-Padding": "true" },
      credentials: "omit",
      referrerPolicy: "no-referrer",
    });
    if (!response.ok) throw new Error(`Pwned Passwords: HTTP ${String(response.status)}`);
    const counts = new Map<string, number>();
    for (const line of (await response.text()).split("\n")) {
      const [suffix, count] = line.trim().split(":");
      const n = Number(count);
      // Padding entries have a count of 0.
      if (suffix && n > 0) counts.set(suffix.toUpperCase(), n);
    }
    return counts;
  }

  async occurrences(password: string): Promise<number> {
    const digest = await sha1Hex(password);
    return (await this.range(digest.slice(0, 5))).get(digest.slice(5)) ?? 0;
  }
}

/**
 * One instance for the whole unlocked session, so the prefix cache survives from one scan to
 * the next: two entries sharing a prefix cost one request, and re-opening the tab costs none.
 * Holds no secret (prefixes and public answers), and is dropped when the vault locks.
 */
let shared: PwnedPasswords | null = null;

export function sharedPwned(): PwnedPasswords {
  shared ??= new PwnedPasswords();
  return shared;
}

export function forgetPwned(): void {
  shared = null;
}
