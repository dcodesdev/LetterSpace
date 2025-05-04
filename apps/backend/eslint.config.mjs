import globals from "globals"
import pluginJs from "@eslint/js"
import * as tseslint from "typescript-eslint"

export default tseslint.config({
  files: ["src/**/*.{js,mjs,cjs,ts}"],
  extends: [pluginJs.configs.recommended],
  languageOptions: {
    globals: {
      ...globals.browser,
      ...globals.node,
    },
    parser: tseslint.parser,
    parserOptions: {
      project: true,
    },
  },
  plugins: {
    "@typescript-eslint": tseslint.plugin,
  },
  rules: {
    "@typescript-eslint/no-unused-vars": ["warn", { caughtErrors: "none" }],
    "no-unused-vars": "off",
  },
})
