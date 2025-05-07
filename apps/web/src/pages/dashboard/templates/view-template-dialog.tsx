import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogTrigger,
} from "@repo/ui"
import { Template } from "backend"
import { useState } from "react"
import { EmailPreview } from "@/components/email-preview"

interface ViewTemplateDialogProps {
  template: Template
  trigger: React.ReactNode
}

export function ViewTemplateDialog({
  template,
  trigger,
}: ViewTemplateDialogProps) {
  const [open, setOpen] = useState(false)

  // Replace {{content}} with sample content for preview
  const previewContent = template.content.replace(
    /{{content}}/g,
    "<p>This is a sample content placeholder. Your actual content will appear here.</p>"
  )

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger>{trigger}</DialogTrigger>
      <DialogContent className="sm:max-w-[800px] h-[600px]">
        <DialogHeader>
          <DialogTitle>{template.name}</DialogTitle>
          <DialogDescription>{template.description}</DialogDescription>
        </DialogHeader>
        <div className="flex-1 overflow-auto">
          <EmailPreview content={previewContent} className="h-[450px]" />
        </div>
      </DialogContent>
    </Dialog>
  )
}
