import { Check, Copy } from "lucide-react"
import { Button } from "@repo/ui"
import { useState } from "react"

interface CopyButtonProps {
  text?: string
  onCopy?: () => void | Promise<void>
  className?: string
}

export function CopyButton({ text, onCopy, className }: CopyButtonProps) {
  const [isCopied, setIsCopied] = useState(false)

  const handleCopy = async () => {
    if (text) {
      await navigator.clipboard.writeText(text)
    } else if (onCopy) {
      await onCopy()
    }
    setIsCopied(true)
    setTimeout(() => setIsCopied(false), 2000)
  }

  return (
    <Button
      variant="ghost"
      size="icon"
      onClick={handleCopy}
      className={className}
    >
      {isCopied ? (
        <Check className="h-4 w-4 text-emerald-500" />
      ) : (
        <Copy className="h-4 w-4" />
      )}
    </Button>
  )
}
