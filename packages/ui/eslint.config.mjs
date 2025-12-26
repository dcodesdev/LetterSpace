import { config } from "@repo/eslint-config/react-internal"

/** @type {import("eslint").Linter.Config} */
export default [
  ...config,
  {
    rules: {
      // Not needed with TypeScript
      "react/prop-types": "off",
      // cmdk uses custom attributes like cmdk-input-wrapper
      "react/no-unknown-property": ["warn", { ignore: ["cmdk-input-wrapper"] }],
    },
  },
  {
    // Allow CommonJS in tailwind config
    files: ["tailwind.config.js"],
    languageOptions: {
      globals: {
        module: "readonly",
        require: "readonly",
      },
    },
    rules: {
      "@typescript-eslint/no-require-imports": "off",
    },
  },
]
