import { Loader2 } from "lucide-react"

type LoaderProps = {
  size?: number
  text?: string
  className?: string
  height?: string
}

export function Loader({
  size = 8,
  text,
  className = "",
  height = "h-[300px]",
}: LoaderProps) {
  return (
    <div className={`flex ${height} items-center justify-center ${className}`}>
      <div className="flex flex-col items-center gap-4">
        <Loader2 className={`h-${size} w-${size} animate-spin text-primary`} />
        {text && <p className="text-sm text-muted-foreground">{text}</p>}
      </div>
    </div>
  )
}
