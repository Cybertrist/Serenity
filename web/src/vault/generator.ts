/** Password and passphrase generator. Uniform randomness from libsodium, no modulo bias. */
import { lib } from "../crypto/sodium";
import wordlistText from "./wordlist/eff-large.txt?raw";

const LOWER = "abcdefghijklmnopqrstuvwxyz";
const UPPER = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
const DIGITS = "0123456789";
const SYMBOLS = "!#$%&*+-=?@^_~.,:;";
const AMBIGUOUS = /[Il1O0o]/g;

export const WORDS: readonly string[] = wordlistText.split("\n").filter((w) => w.length > 0);

export interface PasswordOptions {
  length: number;
  lower: boolean;
  upper: boolean;
  digits: boolean;
  symbols: boolean;
  /** Drop look-alike characters (I, l, 1, O, 0, o). */
  avoidAmbiguous: boolean;
}

export const DEFAULT_PASSWORD: PasswordOptions = {
  length: 20,
  lower: true,
  upper: true,
  digits: true,
  symbols: true,
  avoidAmbiguous: false,
};

export interface PassphraseOptions {
  words: number;
  separator: string;
  capitalize: boolean;
  /** Append a random digit to one word (some sites require a digit). */
  withDigit: boolean;
}

export const DEFAULT_PASSPHRASE: PassphraseOptions = {
  words: 6,
  separator: "-",
  capitalize: false,
  withDigit: false,
};

function uniform(n: number): number {
  return lib().randombytes_uniform(n);
}

function pick(alphabet: string): string {
  return alphabet.charAt(uniform(alphabet.length));
}

function classes(opts: PasswordOptions): string[] {
  const sets = [
    opts.lower ? LOWER : "",
    opts.upper ? UPPER : "",
    opts.digits ? DIGITS : "",
    opts.symbols ? SYMBOLS : "",
  ].map((s) => (opts.avoidAmbiguous ? s.replace(AMBIGUOUS, "") : s));
  return sets.filter((s) => s.length > 0);
}

export function generatePassword(opts: PasswordOptions = DEFAULT_PASSWORD): string {
  const sets = classes(opts);
  if (sets.length === 0) throw new Error("choose at least one character class");
  if (opts.length < sets.length || opts.length > 256) throw new Error("invalid length");
  const all = sets.join("");
  // One character of each chosen class, the rest from the whole alphabet, then shuffle.
  const chars = sets.map(pick);
  while (chars.length < opts.length) chars.push(pick(all));
  for (let i = chars.length - 1; i > 0; i--) {
    const j = uniform(i + 1);
    [chars[i], chars[j]] = [chars[j] ?? "", chars[i] ?? ""];
  }
  return chars.join("");
}

export function generatePassphrase(opts: PassphraseOptions = DEFAULT_PASSPHRASE): string {
  if (opts.words < 3 || opts.words > 20) throw new Error("invalid word count");
  const words = Array.from({ length: opts.words }, () => WORDS[uniform(WORDS.length)] ?? "");
  const shaped = opts.capitalize ? words.map((w) => w.charAt(0).toUpperCase() + w.slice(1)) : words;
  if (opts.withDigit) {
    const i = uniform(shaped.length);
    shaped[i] = `${shaped[i] ?? ""}${pick(DIGITS)}`;
  }
  return shaped.join(opts.separator);
}

/** Entropy in bits, as generated (not an estimate of a human-chosen password). */
export function passwordBits(opts: PasswordOptions): number {
  return opts.length * Math.log2(classes(opts).join("").length);
}

export function passphraseBits(opts: PassphraseOptions): number {
  const digit = opts.withDigit ? Math.log2(10 * opts.words) : 0;
  return opts.words * Math.log2(WORDS.length) + digit;
}
