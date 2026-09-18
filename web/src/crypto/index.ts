/**
 * Cryptography of the dual-zone vault. Normative spec: docs/crypto.md.
 * Every primitive comes from libsodium. Any change requires updating the spec and the shared
 * test vectors, after explicit approval.
 */
export * as blocks from "./blocks";
export * as contexts from "./contexts";
export * as encoding from "./encoding";
export { CryptoError } from "./errors";
export * as items from "./items";
export * as kdf from "./kdf";
export * as recovery from "./recovery";
export * as sealed from "./sealed";
export { ready } from "./sodium";
