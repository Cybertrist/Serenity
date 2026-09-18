/** Decryption, parsing or validation failed. Messages never contain key material. */
export class CryptoError extends Error {
  override name = "CryptoError";
}
