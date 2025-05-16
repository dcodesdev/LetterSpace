import {
  Button,
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@repo/ui"
import { Eye, AlertCircle, Send, Loader2 } from "lucide-react"
import { toast } from "sonner"
import { trpc } from "@/trpc"
import { useSession } from "@/hooks"
import type { Message } from "backend" // Assuming Message type includes relations after backend change
import { MessagePreviewDialog } from "./message-preview-dialog"
import { MessageErrorDialog } from "./message-error-dialog"

type MessageWithRelations = Message & {
  Subscriber: {
    name: string | null
    email: string
  }
  Campaign: {
    id: string
    title: string
  }
}

interface MessageActionsProps {
  message: MessageWithRelations
  onOpenPreview: (id: string) => void
  onClosePreview: (id: string) => void
  onOpenError: (id: string) => void
  onCloseError: (id: string) => void
  openPreviews: Record<string, boolean>
  openErrors: Record<string, boolean>
}

export function MessageActions({
  message,
  onOpenPreview,
  onClosePreview,
  onOpenError,
  onCloseError,
  openPreviews,
  openErrors,
}: MessageActionsProps) {
  const { organization } = useSession()
  const utils = trpc.useUtils()

  const resendMutation = trpc.message.resend.useMutation({
    onSuccess: () => {
      toast.success(`Message queued for resending.`)
      utils.message.list.invalidate()
    },
    onError: (error) => {
      toast.error(`Failed to resend message: ${error.message}`)
    },
  })

  const handleResend = () => {
    if (resendMutation.isPending) {
      return
    }

    if (!organization?.id) {
      toast.error("Organization ID not found. Cannot resend.")
      return
    }
    resendMutation.mutate({
      messageId: message.id,
      organizationId: organization.id,
    })
  }

  return (
    <div className="flex items-center gap-1">
      <AlertDialog>
        <AlertDialogTrigger asChild>
          <Button variant="ghost" size="icon" title="Resend Message">
            <Send className="h-4 w-4" />
          </Button>
        </AlertDialogTrigger>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action will attempt to resend the message to{" "}
              {message.Subscriber.email}.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleResend}>
              {resendMutation.isPending && (
                <Loader2 className="h-4 w-4 animate-spin" />
              )}
              Confirm Resend
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Button
        variant="ghost"
        size="icon"
        title="Preview Message"
        onClick={() => onOpenPreview(message.id)}
      >
        <Eye className="h-4 w-4" />
      </Button>
      {message.error && (
        <Button
          variant="ghost"
          size="icon"
          title="View Error"
          className="text-destructive"
          onClick={() => onOpenError(message.id)}
        >
          <AlertCircle className="h-4 w-4" />
        </Button>
      )}
      <MessagePreviewDialog
        message={message}
        open={openPreviews[message.id] ?? false}
        onOpenChange={(open) =>
          open ? onOpenPreview(message.id) : onClosePreview(message.id)
        }
      />
      <MessageErrorDialog
        message={message}
        open={openErrors[message.id] ?? false}
        onOpenChange={(open) =>
          open ? onOpenError(message.id) : onCloseError(message.id)
        }
      />
    </div>
  )
}
