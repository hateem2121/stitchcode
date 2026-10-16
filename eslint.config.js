import js from "@eslint/js";
import globals from "globals";
import reactHooks from "eslint-plugin-react-hooks";
import reactRefresh from "eslint-plugin-react-refresh";
import tseslint from "typescript-eslint";
import { globalIgnores } from "eslint/config";

export default tseslint.config([
  globalIgnores([
    "dist",
    "dist-electron",
    "coverage",
    // Vendored reference implementation (kept verbatim, excluded from lint)
    "src/lib/qrcodegen",
  ]),
  {
    files: ["**/*.{ts,tsx}"],
    extends: [
      js.configs.recommended,
      ...tseslint.configs.recommended,
      reactHooks.configs.flat["recommended-latest"],
    ],
    languageOptions: {
      ecmaVersion: 2022,
      globals: globals.browser,
    },
  },
  {
    files: [
      "src/**/*.test.ts",
      "src/**/*.test.tsx",
      "src/test/**/*.ts",
      "vitest.config.ts",
    ],
    languageOptions: {
      globals: { ...globals.browser, ...globals.node },
    },
  },
  {
    files: ["electron/**/*.cjs", "electron/**/*.js", "*.config.js"],
    languageOptions: {
      globals: globals.node,
    },
  },
  {
    plugins: { "react-refresh": reactRefresh },
    rules: {
      // useToast is consumed across the app from the ui module.
      "react-refresh/only-export-components": [
        "error",
        { allowExportNames: ["useToast"] },
      ],
    },
  },
]);
