import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    include: ["src/**/*.test.ts"],
    // Argon2id at 64 MiB runs in WebAssembly: allow a few seconds per vector.
    testTimeout: 30_000,
  },
});
