import { useState } from "react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@repo/ui"
import { Template } from "backend"
import { toast } from "sonner"
import { trpc } from "@/trpc"
import {
  UpdateTemplateForm,
  UpdateTemplateFormData,
} from "./update-template-form"

interface UpdateTemplateDialogProps {
  template: Template
  trigger: React.ReactNode
  organizationId: string
}

export function UpdateTemplateDialog({
  template,
  trigger,
  organizationId,
}: UpdateTemplateDialogProps) {
  const [open, setOpen] = useState(false)
  const utils = trpc.useUtils()

  const updateTemplateMutation = trpc.template.update.useMutation({
    onSuccess: () => {
      toast.success("Template updated successfully")
      setOpen(false)
      utils.template.list.invalidate()
    },
    onError: (error) => {
      toast.error(error.message)
    },
  })

  const handleUpdateTemplate = (values: UpdateTemplateFormData) => {
    updateTemplateMutation.mutate({
      id: template.id,
      organizationId,
      ...values,
    })
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger>{trigger}</DialogTrigger>
      <DialogContent className="sm:max-w-[625px]">
        <DialogHeader>
          <DialogTitle>Edit Template</DialogTitle>
          <DialogDescription>
            Update your email template details.
          </DialogDescription>
        </DialogHeader>
        <UpdateTemplateForm
          template={template}
          onSubmit={handleUpdateTemplate}
          isSubmitting={updateTemplateMutation.isPending}
        />
      </DialogContent>
    </Dialog>
  )
}
