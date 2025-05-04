import { Component, ErrorInfo, ReactNode } from "react"
import { Button } from "@repo/ui"
import { AlertCircle } from "lucide-react"

interface Props {
  children: ReactNode
}

interface State {
  hasError: boolean
  error?: Error
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
  }

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error }
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("Uncaught error:", error, errorInfo)
  }

  public render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-background">
          <div className="text-center p-8 max-w-2xl mx-auto">
            <div className="flex justify-center mb-6">
              <div className="h-12 w-12 rounded-full bg-destructive/10 flex items-center justify-center">
                <AlertCircle className="h-6 w-6 text-destructive" />
              </div>
            </div>
            <h1 className="text-3xl font-bold mb-2">Something went wrong</h1>
            <p className="text-muted-foreground mb-6">
              An unexpected error has occurred. Our team has been notified.
            </p>
            <div className="bg-muted/50 rounded-lg p-4 mb-6">
              <pre className="text-sm text-muted-foreground break-words whitespace-pre-wrap">
                {this.state.error?.message}
              </pre>
            </div>
            <Button onClick={() => window.location.reload()}>Try Again</Button>
          </div>
        </div>
      )
    }

    return this.props.children
  }
}
