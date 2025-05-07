import { Button } from "@repo/ui"
import { Link, useNavigate } from "react-router"

export function NotFoundPage() {
  const navigate = useNavigate()

  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="text-center p-8 max-w-3xl mx-auto">
        <div className="flex flex-col items-center mb-8">
          <div className="relative">
            <div className="absolute -z-10 w-40 h-40 rounded-full bg-primary/5 animate-pulse" />
            <div className="text-[120px] font-bold text-primary/90">404</div>
          </div>
        </div>

        <h1 className="text-4xl font-bold mb-3">Page Not Found</h1>
        <p className="text-muted-foreground mb-8 text-lg max-w-md mx-auto">
          Sorry, we couldn't find the page you're looking for. It might have
          been moved or doesn't exist.
        </p>

        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Link to="/">
            <Button size="lg" className="min-w-40">
              Go Back Home
            </Button>
          </Link>
          <Button
            variant="outline"
            size="lg"
            className="min-w-40"
            onClick={() => navigate(-1)}
          >
            Go Back
          </Button>
        </div>
      </div>
    </div>
  )
}
