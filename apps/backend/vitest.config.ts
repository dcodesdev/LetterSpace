// vitest.config.integration.ts
import { defineConfig } from "vitest/config"
import path from "path"

export default defineConfig({
  test: {
    include: ["tests/**/*.test.ts"],
    setupFiles: ["tests/integration/helpers/setup.ts"],
    sequence: {
      concurrent: false,
    },
  },
  resolve: {
    alias: {
      "@src": path.resolve(__dirname, "./src"),
      "@tests": path.resolve(__dirname, "./tests"),
      "@helpers": path.resolve(__dirname, "./tests/integration/helpers"),
    },
  },
})
