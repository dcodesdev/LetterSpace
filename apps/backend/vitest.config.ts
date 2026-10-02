// vitest.config.integration.ts
import path from "path"
import { defineConfig } from "vitest/config"

export default defineConfig({
  test: {
    include: ["tests/**/*.test.ts", "src/**/*.test.ts"],
    globalSetup: ["tests/integration/helpers/global-setup.ts"],
    setupFiles: ["tests/integration/helpers/setup.ts"],
    // One shared test database: never run files or tests in parallel.
    fileParallelism: false,
    sequence: {
      concurrent: false,
    },
  },
  resolve: {
    alias: {
      "@src": path.resolve(__dirname, "./src"),
      "@tests": path.resolve(__dirname, "./tests"),
      "@helpers": path.resolve(__dirname, "./tests/integration/helpers"),
      "@prisma-client": path.resolve(__dirname, "./prisma/client"),
    },
  },
})
