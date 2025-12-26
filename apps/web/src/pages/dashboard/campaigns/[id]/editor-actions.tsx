import { useState } from "react"
import { useParams } from "react-router"
import { Button, Input } from "@repo/ui"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@repo/ui"
import { Send } from "lucide-react"
import { toast } from "sonner"
import { useLocalStorage } from "usehooks-ts"
import { useSession } from "@/hooks"
import { trpc } from "@/trpc"
import { useCampaignContext } from "./useCampaignContext"

export const EditorActions = () => {
  const { updatePending, isEditable, updateCampaign, form } =
    useCampaignContext()
  const [testEmail, setTestEmail] = useLocalStorage("test-smtp-email", "")
  const [isTestDialogOpen, setIsTestDialogOpen] = useState(false)
  const { organization } = useSession()
  const { id } = useParams()

  const testEmailMutation = trpc.campaign.sendTestEmail.useMutation({
    onSuccess: () => {
      toast.success("Test email sent successfully")
      setIsTestDialogOpen(false)
      setTestEmail("")
    },
    onError: (error) => {
      toast.error(error.message)
    },
  })

  const onSave = () => {
    updateCampaign({
      onSuccess() {
        toast.success("Campaign updated successfully")
      },
    })
  }

  const handleSendTest = () => {
    if (!organization?.id || !id) return

    testEmailMutation.mutate({
      campaignId: id,
      organizationId: organization.id,
      email: testEmail,
    })
  }

  return (
    <div className="flex items-center gap-2">
      {isEditable && (
        <>
          {form.formState.isDirty && (
            <span className="text-sm text-muted-foreground">
              You have unsaved changes
            </span>
          )}
          <Dialog open={isTestDialogOpen} onOpenChange={setIsTestDialogOpen}>
            <DialogTrigger asChild>
              <Button type="button" variant="outline">
                <Send className="h-4 w-4 mr-2" />
                Send Test
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Send Test Email</DialogTitle>
                <DialogDescription>
                  Send a test email to verify your campaign content
                </DialogDescription>
              </DialogHeader>
              <div className="py-4">
                <Input
                  type="email"
                  placeholder="Enter email address"
                  value={testEmail}
                  onChange={(e) => setTestEmail(e.target.value)}
                />
              </div>
              <DialogFooter>
                <Button
                  variant="outline"
                  onClick={() => setIsTestDialogOpen(false)}
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleSendTest}
                  disabled={!testEmail || testEmailMutation.isPending}
                  loading={testEmailMutation.isPending}
                >
                  Send Test
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          <Button type="button" onClick={onSave} disabled={updatePending}>
            {updatePending ? (
              <>
                <div className="h-4 w-4 mr-2 animate-spin rounded-full border-2 border-current border-t-transparent" />
                Saving...
              </>
            ) : (
              "Save Changes"
            )}
          </Button>
        </>
      )}

      {/* <Dialog open={previewOpen} onOpenChange={setPreviewOpen}>
        <DialogTrigger asChild>
          <Button type="button" variant="outline" size="sm">
            <Eye className="w-4 h-4 mr-2" />
            Preview
          </Button>
        </DialogTrigger>
        <DialogContent className="max-w-[900px] p-0">
          <EmailPreview
            content={content}
            className="min-h-[600px] cursor-default rounded-md"
          />
        </DialogContent>
      </Dialog> */}
    </div>
  )
}
