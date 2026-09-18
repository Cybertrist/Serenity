import sodium from "libsodium-wrappers-sumo";
import { CryptoError } from "./errors";

export type Sodium = typeof sodium;

let initialised = false;

/** Load the libsodium WebAssembly module. Await once before any other crypto call. */
export async function ready(): Promise<void> {
  await sodium.ready;
  initialised = true;
}

export function lib(): Sodium {
  if (!initialised) throw new CryptoError("libsodium is not initialised: await ready() first");
  return sodium;
}
