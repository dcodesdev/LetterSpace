import { Loader2 } from "lucide-react"

export function CenteredLoader() {
  return (
    <div className="flex items-center justify-center h-screen w-full">
      <Loader2 className="animate-spin h-8 w-8 text-primary" />
    </div>
  )
}
