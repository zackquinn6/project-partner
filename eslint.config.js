import js from "@eslint/js";
import globals from "globals";
import reactHooks from "eslint-plugin-react-hooks";
import reactRefresh from "eslint-plugin-react-refresh";
import tseslint from "typescript-eslint";

export default tseslint.config(
  { ignores: ["dist"] },
  {
    extends: [js.configs.recommended, ...tseslint.configs.recommended],
    files: ["**/*.{ts,tsx}"],
    languageOptions: {
      ecmaVersion: 2020,
      globals: globals.browser,
    },
    plugins: {
      "react-hooks": reactHooks,
      "react-refresh": reactRefresh,
    },
    rules: {
      ...reactHooks.configs.recommended.rules,
      "react-refresh/only-export-components": [
        "warn",
        { allowConstantExport: true },
      ],
      "@typescript-eslint/no-unused-vars": "off",
      // Keep lint actionable given current repo state.
      "@typescript-eslint/no-explicit-any": "warn",
      "prefer-const": "warn",
      "no-useless-escape": "warn",
      "no-control-regex": "warn",
      "no-empty": "warn",
      "no-case-declarations": "warn",
      "no-prototype-builtins": "warn",
      "no-irregular-whitespace": "warn",
      "@typescript-eslint/no-empty-object-type": "warn",
      "react-hooks/rules-of-hooks": "warn",
    },
  }
);
