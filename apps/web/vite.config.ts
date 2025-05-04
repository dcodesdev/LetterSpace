import { defineConfig } from "vite"
import react from "@vitejs/plugin-react"
import path from "path"

// Plugin to force process exit after build completes
function closePlugin() {
  return {
    name: "vite-plugin-close",
    closeBundle() {
      if (process.env.NODE_ENV === "production" || process.env.CI) {
        setTimeout(() => {
          process.exit(0)
        }, 1000)
      }
    },
  }
}

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), closePlugin()],
  // add the alias import for @/
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "src"),
    },
  },
  build: {
    rollupOptions: {
      watch: false,
    },
  },
})
