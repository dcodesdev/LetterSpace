import { StrictMode } from "react"
import { createRoot } from "react-dom/client"
import { Toaster } from "sonner"
import { App } from "./app.tsx"
import { ErrorBoundary } from "./components/error-boundary"
import { ThemeProvider } from "./components/theme-provider/theme-provider.tsx"
import "./index.css"
import { TrpcProvider } from "./trpc-provider.tsx"

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <ErrorBoundary>
      <TrpcProvider>
        <ThemeProvider defaultTheme="dark" storageKey="vite-ui-theme">
          <App />
          <Toaster position="top-center" />
        </ThemeProvider>
      </TrpcProvider>
    </ErrorBoundary>
  </StrictMode>
)
