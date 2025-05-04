import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@repo/ui"
import { Message } from "backend"
import { EmailPreview } from "@/components"

interface MessagePreviewDialogProps {
  message: Message & { Campaign: { title: string } }
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function MessagePreviewDialog({
  message,
  open,
  onOpenChange,
}: MessagePreviewDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[800px] h-[600px]">
        <DialogHeader>
          <DialogTitle>Message Preview - {message.Campaign.title}</DialogTitle>
        </DialogHeader>
        <div className="flex-1 overflow-auto">
          <EmailPreview
            content={message?.content ?? "No content available"}
            className="h-[450px]"
          />
        </div>
      </DialogContent>
    </Dialog>
  )
}
