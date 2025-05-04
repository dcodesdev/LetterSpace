import "./index.css"
import { StrictMode } from "react"
import { createRoot } from "react-dom/client"
import { App } from "./app.tsx"
import { ErrorBoundary } from "./components/error-boundary"
import { TrpcProvider } from "./trpc-provider.tsx"
import { Toaster } from "sonner"
import { ThemeProvider } from "./components/theme-provider/theme-provider.tsx"

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
