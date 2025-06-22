import { useState } from "react"
import { Button } from "@repo/ui"
import { Eye, Check } from "lucide-react"
import { useDebounceValue } from "usehooks-ts"

interface WebhookUrlDisplayProps {
  url: string
  variant?: "table" | "details"
  className?: string
}

export function WebhookUrlDisplay({
  url,
  variant = "table",
  className = "",
}: WebhookUrlDisplayProps) {
  const [isVisible, setIsVisible] = useState(false)
  const [copyTriggered, setCopyTriggered] = useState(0)
  const [debouncedCopyTriggered] = useDebounceValue(copyTriggered, 2000)

  const isCopied = copyTriggered > debouncedCopyTriggered

  const handleToggleVisibility = () => {
    setIsVisible(!isVisible)
  }

  const handleCopyUrl = async () => {
    await navigator.clipboard.writeText(url)
    setCopyTriggered((prev) => prev + 1)
  }

  if (variant === "details") {
    return (
      <div className={className}>
        <label className="text-sm font-medium">Webhook URL</label>
        <div className="mt-1 flex items-center gap-2">
          <Button variant="ghost" size="icon" onClick={handleToggleVisibility}>
            {isVisible ? (
              <Eye className="h-4 w-4" />
            ) : (
              <Eye className="h-4 w-4 opacity-50" />
            )}
          </Button>
          {isVisible ? (
            <div className="flex items-center gap-2 flex-1">
              <code
                className="flex-1 rounded bg-muted px-3 py-2 text-sm cursor-pointer hover:bg-muted/80 transition-colors"
                onClick={handleCopyUrl}
              >
                {url}
              </code>
              {isCopied && <Check className="h-4 w-4 text-emerald-500" />}
            </div>
          ) : (
            <code className="flex-1 rounded bg-muted px-3 py-2 text-sm text-muted-foreground">
              ••••••••••••••••••••••••••••••••••••••••••••
            </code>
          )}
        </div>
      </div>
    )
  }

  // Table variant
  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <div className="flex items-center gap-1">
        <Button variant="ghost" size="icon" onClick={handleToggleVisibility}>
          {isVisible ? (
            <Eye className="h-4 w-4" />
          ) : (
            <Eye className="h-4 w-4 opacity-50" />
          )}
        </Button>
        {isVisible ? (
          <div className="flex items-center gap-1">
            <code
              className="rounded bg-muted px-2 py-1 text-xs cursor-pointer hover:bg-muted/80 transition-colors"
              onClick={handleCopyUrl}
            >
              {url}
            </code>
            {isCopied && <Check className="h-3 w-3 text-emerald-500" />}
          </div>
        ) : (
          <code className="rounded bg-muted px-2 py-1 text-xs text-muted-foreground">
            ••••••••••••••••••••
          </code>
        )}
      </div>
    </div>
  )
}
