import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@repo/ui"
import { Message } from "backend"

interface MessageErrorDialogProps {
  message: Message
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function MessageErrorDialog({
  message,
  open,
  onOpenChange,
}: MessageErrorDialogProps) {
  if (!message.error) return null

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Message Error Details</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="text-sm">
            <div className="font-medium mb-2">Error Message:</div>
            <div className="p-4 rounded-md bg-destructive/10 text-destructive">
              {message.error}
            </div>
          </div>
          <div className="text-sm text-muted-foreground">
            <div>Message ID: {message.id}</div>
            <div>Status: {message.status}</div>
            <div>Time: {new Date(message.updatedAt).toLocaleString()}</div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
