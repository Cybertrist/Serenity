import js from "@eslint/js";
import globals from "globals";
import tseslint from "typescript-eslint";

export default tseslint.config(
  {
    ignores: [
      "dist",
      "dev-dist",
      "node_modules",
      "e2e/shots",
      // Drawn by scripts/build-logos.mjs before every lint, build and test.
      "src/features/vault/logos.generated.ts",
    ],
  },
  js.configs.recommended,
  ...tseslint.configs.strictTypeChecked,
  {
    languageOptions: {
      globals: { ...globals.browser, ...globals.node },
      parserOptions: { projectService: true, tsconfigRootDir: import.meta.dirname },
    },
  },
  {
    files: ["eslint.config.js", "e2e/**/*.mjs", "scripts/**/*.mjs"],
    ...tseslint.configs.disableTypeChecked,
  },
);
