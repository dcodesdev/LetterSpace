import {
  AlertDialog,
  AlertDialogTrigger,
  Button,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogCancel,
  AlertDialogAction,
  Badge,
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@repo/ui"
import { X, AlertTriangle } from "lucide-react"
import { useCampaignContext } from "./useCampaignContext"
import { trpc } from "@/trpc"
import { toast } from "sonner"
import { useNavigate } from "react-router"
import { toastError } from "@/utils"
import { useSession } from "@/hooks"
import { useParams } from "react-router"
import { useMemo, useState } from "react"

export const CampaignActions = () => {
  const { campaignQuery, form } = useCampaignContext()
  const navigate = useNavigate()
  const { organization } = useSession()
  const { id } = useParams()
  const [showUnsubscribeWarning, setShowUnsubscribeWarning] = useState(false)
  const recipientCount =
    campaignQuery.data?.campaign.CampaignLists.reduce(
      (acc, list) => acc + list.List._count.ListSubscribers,
      0
    ) || 0

  const utils = trpc.useUtils()
  const startCampaignMutation = trpc.campaign.start.useMutation({
    onSuccess: () => {
      toast.success("Campaign started successfully")
      utils.campaign.invalidate()
      utils.message.list.invalidate()
      navigate("/dashboard/campaigns")
    },
    onError: (error) => {
      toastError("Error starting campaign", error)
    },
  })

  const cancelCampaignMutation = trpc.campaign.cancel.useMutation({
    onSuccess: () => {
      toast.success("Campaign cancelled successfully")
      utils.campaign.get.invalidate()
    },
    onError: (error) => {
      toastError("Error cancelling campaign", error)
    },
  })

  const updateCampaign = trpc.campaign.update.useMutation()

  const handleSubmitCampaign = () => {
    if (!organization?.id || !id) return

    form.handleSubmit((values) => {
      updateCampaign.mutate(
        {
          id,
          organizationId: organization.id,
          ...values,
        },
        {
          onSuccess() {
            startCampaignMutation.mutate({
              id,
              organizationId: organization.id,
            })
          },
        }
      )
    })()
  }

  const content = form.watch("content") || ""

  const finalContent = useMemo(() => {
    const template = campaignQuery.data?.campaign.Template?.content || ""
    const final = template.replace(/{{content}}/g, content)
    return final
  }, [campaignQuery.data?.campaign.Template?.content, content])

  const hasUnsubscribeLink = useMemo(
    () => finalContent.includes("{{UNSUBSCRIBE_LINK}}"),
    [finalContent]
  )

  const handleStartCampaign = () => {
    if (!hasUnsubscribeLink) {
      setShowUnsubscribeWarning(true)
      return
    }

    handleSubmitCampaign()
  }

  const hasNoTemplateSelected = campaignQuery.data?.campaign.Template === null

  const warning = useMemo(() => {
    if (hasNoTemplateSelected) {
      return "No template selected"
    }

    return "Missing unsubscribe link in email content"
  }, [hasNoTemplateSelected])

  const handleCancelCampaign = () => {
    if (!organization?.id || !id) return

    cancelCampaignMutation.mutate({
      id,
      organizationId: organization.id,
    })
  }

  const startCampaignDisabled =
    startCampaignMutation.isPending ||
    updateCampaign.isPending ||
    form.formState.isDirty

  switch (campaignQuery.data?.campaign?.status) {
    case "DRAFT":
      return (
        <>
          <AlertDialog>
            <div className="flex items-center gap-2">
              <Badge variant="outline">{recipientCount} recipients</Badge>
              {!hasUnsubscribeLink && (
                <TooltipProvider>
                  <Tooltip delayDuration={50}>
                    <TooltipTrigger asChild>
                      <AlertTriangle className="h-4 w-4 text-yellow-500 cursor-pointer" />
                    </TooltipTrigger>
                    <TooltipContent className="cursor-pointer">
                      <p>{warning}</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              )}
              <AlertDialogTrigger asChild>
                <Button
                  disabled={startCampaignDisabled}
                  loading={startCampaignMutation.isPending}
                >
                  Start Campaign
                </Button>
              </AlertDialogTrigger>
            </div>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Start Campaign</AlertDialogTitle>
                <AlertDialogDescription>
                  Are you sure you want to start this campaign? This will begin
                  sending emails to all selected subscribers.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction onClick={handleStartCampaign}>
                  Start Campaign
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>

          <AlertDialog
            open={showUnsubscribeWarning}
            onOpenChange={setShowUnsubscribeWarning}
          >
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Missing Unsubscribe Link</AlertDialogTitle>
                <AlertDialogDescription>
                  Your email content does not include an unsubscribe link. It's
                  recommended to add {`{{UNSUBSCRIBE_LINK}}`} to your template
                  or content. Do you want to continue anyway?
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction
                  onClick={() => {
                    setShowUnsubscribeWarning(false)
                    handleSubmitCampaign()
                  }}
                >
                  Continue Anyway
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </>
      )
    case "SENDING":
      return (
        <Button
          variant="destructive"
          onClick={handleCancelCampaign}
          disabled={cancelCampaignMutation.isPending}
        >
          {cancelCampaignMutation.isPending ? (
            <>
              <div className="h-4 w-4 mr-2 animate-spin rounded-full border-2 border-current border-t-transparent" />
              Cancelling...
            </>
          ) : (
            <>
              <X className="h-4 w-4 mr-2" />
              Cancel Campaign
            </>
          )}
        </Button>
      )
    default:
      return null
  }
}
