import { toast } from "sonner"
import {
  Button,
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@repo/ui"
import { Copy, Hash } from "lucide-react"

export function MessageIdCell({ messageId }: { messageId: string | null }) {
  const copyToClipboard = () => {
    if (messageId) {
      navigator.clipboard.writeText(messageId)
      toast.success("Message ID copied to clipboard")
    }
  }

  if (!messageId) {
    return <span className="text-muted-foreground text-sm">-</span>
  }

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className="h-6 px-1 text-muted-foreground hover:text-foreground"
        >
          <Hash className="h-3 w-3" />
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Message ID</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="flex items-center justify-between p-3 bg-muted rounded-md">
            <span className="text-sm font-mono break-all">{messageId}</span>
            <Button
              variant="ghost"
              size="sm"
              onClick={copyToClipboard}
              className="ml-2 flex-shrink-0"
            >
              <Copy className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
