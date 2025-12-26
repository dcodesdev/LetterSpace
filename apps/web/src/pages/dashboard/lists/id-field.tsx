import { useState } from "react"
import { Badge } from "@repo/ui"
import { CheckIcon, CopyIcon } from "lucide-react"
import { WithTooltip } from "@/components"

export const IDField = ({ id }: { id: string }) => {
  const [copied, setCopied] = useState(false)

  const shortId = id.slice(0, 8)

  const copyToClipboard = () => {
    navigator.clipboard.writeText(id)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="flex items-center gap-2">
      {copied ? (
        <CheckIcon className="h-4 w-4 text-green-500" />
      ) : (
        <CopyIcon
          onClick={copyToClipboard}
          className="h-4 w-4 cursor-pointer"
        />
      )}

      <WithTooltip content={id}>
        <Badge className="cursor-pointer" variant="secondary">
          {shortId}
        </Badge>
      </WithTooltip>
    </div>
  )
}
