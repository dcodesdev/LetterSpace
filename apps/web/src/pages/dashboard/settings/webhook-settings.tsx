import { useState } from "react"
import { Link } from "react-router"
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  Button,
  Table,
  TableHeader,
  TableRow,
  TableHead,
  TableBody,
  TableCell,
  Dialog,
  DialogTrigger,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  Badge,
} from "@repo/ui"
import { Plus, Webhook, Trash2, Edit, Eye } from "lucide-react"
import { trpc } from "@/trpc"
import { useSession } from "@/hooks"
import { toast } from "sonner"
import { format } from "date-fns"
import dayjs from "dayjs"
import relativeTime from "dayjs/plugin/relativeTime"
import { AlertDialogConfirmation, CopyButton } from "@/components"
import { WebhookForm, WebhookFormData } from "./webhook-form"

dayjs.extend(relativeTime)

export function WebhookSettings() {
  const { organization } = useSession()
  const [isCreating, setIsCreating] = useState(false)
  const [editingWebhook, setEditingWebhook] = useState<string | null>(null)
  const [webhookToDelete, setWebhookToDelete] = useState<string | null>(null)

  const { data: webhooks, isLoading } = trpc.webhook.list.useQuery(
    {
      organizationId: organization?.id ?? "",
    },
    {
      enabled: !!organization?.id,
    }
  )

  const utils = trpc.useUtils()

  const createWebhook = trpc.webhook.create.useMutation({
    onSuccess: () => {
      toast.success("Webhook created successfully")
      setIsCreating(false)
      utils.webhook.list.invalidate()
    },
    onError: (error) => {
      toast.error(error.message)
    },
  })

  const updateWebhook = trpc.webhook.update.useMutation({
    onSuccess: () => {
      toast.success("Webhook updated successfully")
      setEditingWebhook(null)
      utils.webhook.list.invalidate()
    },
    onError: (error) => {
      toast.error(error.message)
    },
  })

  const deleteWebhook = trpc.webhook.delete.useMutation({
    onSuccess: () => {
      toast.success("Webhook deleted")
      setWebhookToDelete(null)
      utils.webhook.list.invalidate()
    },
    onError: (error) => {
      toast.error(error.message)
    },
  })

  const handleCreateSubmit = (values: WebhookFormData) => {
    if (!organization?.id) return
    createWebhook.mutate({
      organizationId: organization.id,
      ...values,
    })
  }

  const handleUpdateSubmit = (values: WebhookFormData) => {
    if (!organization?.id || !editingWebhook) return
    updateWebhook.mutate({
      id: editingWebhook,
      organizationId: organization.id,
      ...values,
    })
  }

  const handleDelete = () => {
    if (!webhookToDelete || !organization?.id) return
    deleteWebhook.mutate({
      id: webhookToDelete,
      organizationId: organization.id,
    })
  }

  const getWebhookUrl = (webhookId: string) => {
    // Get backend URL from environment or API configuration
    const baseUrl = import.meta.env.VITE_API_URL || window.location.origin
    return `${baseUrl}/webhook/${webhookId}`
  }

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Receiving Webhooks</CardTitle>
              <CardDescription>
                Configure endpoints to receive webhook notifications from SMTP
                providers and automatically update message delivery statuses
              </CardDescription>
            </div>
            <Dialog open={isCreating} onOpenChange={setIsCreating}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="mr-2 h-4 w-4" />
                  Add Webhook
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-[700px] max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>Add Webhook</DialogTitle>
                  <DialogDescription>
                    Create a new webhook endpoint to receive events from SMTP
                    servers
                  </DialogDescription>
                </DialogHeader>
                <WebhookForm
                  onSubmit={handleCreateSubmit}
                  isLoading={createWebhook.isPending}
                  submitText="Create"
                  onCancel={() => setIsCreating(false)}
                />
              </DialogContent>
            </Dialog>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex min-h-[200px] items-center justify-center">
              <div className="text-muted-foreground">Loading webhooks...</div>
            </div>
          ) : !webhooks?.length ? (
            <div className="flex min-h-[400px] flex-col items-center justify-center rounded-lg border border-dashed">
              <div className="mx-auto flex max-w-[420px] flex-col items-center justify-center text-center">
                <div className="flex h-20 w-20 items-center justify-center rounded-full bg-muted">
                  <Webhook className="h-10 w-10" />
                </div>
                <h3 className="mt-4 text-lg font-semibold">No webhooks</h3>
                <p className="mb-4 mt-2 text-sm text-muted-foreground">
                  You haven't created any webhooks yet. Add one to start
                  receiving events from SMTP servers and automatically update
                  message statuses.
                </p>
                <Button onClick={() => setIsCreating(true)}>
                  <Plus className="mr-2 h-4 w-4" />
                  Add Webhook
                </Button>
              </div>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Webhook URL</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Created</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {webhooks?.map((webhook) => (
                  <TableRow key={webhook.id}>
                    <TableCell className="font-medium">
                      <Link
                        to={`/dashboard/settings/webhooks/${webhook.id}`}
                        className="hover:underline"
                      >
                        {webhook.name}
                      </Link>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <code className="rounded bg-muted px-2 py-1 text-xs">
                          {getWebhookUrl(webhook.id)}
                        </code>
                        <CopyButton text={getWebhookUrl(webhook.id)} />
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant={webhook.isActive ? "default" : "secondary"}
                      >
                        {webhook.isActive ? "Active" : "Inactive"}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="text-sm text-muted-foreground">
                        {format(new Date(webhook.createdAt), "MMM d, yyyy")}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {dayjs(webhook.createdAt).fromNow()}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Link to={`/dashboard/settings/webhooks/${webhook.id}`}>
                          <Button variant="ghost" size="icon">
                            <Eye className="h-4 w-4" />
                          </Button>
                        </Link>
                        <Dialog
                          key={`edit-${webhook.id}`}
                          open={editingWebhook === webhook.id}
                          onOpenChange={(open) => {
                            if (!open) setEditingWebhook(null)
                          }}
                        >
                          <DialogTrigger asChild>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => setEditingWebhook(webhook.id)}
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                          </DialogTrigger>
                          <DialogContent className="sm:max-w-[700px] max-h-[90vh] overflow-y-auto">
                            <DialogHeader>
                              <DialogTitle>Edit Webhook</DialogTitle>
                              <DialogDescription>
                                Update your webhook configuration for receiving
                                SMTP events
                              </DialogDescription>
                            </DialogHeader>
                            <WebhookForm
                              key={`form-${webhook.id}`}
                              onSubmit={handleUpdateSubmit}
                              isLoading={updateWebhook.isPending}
                              submitText="Update"
                              onCancel={() => setEditingWebhook(null)}
                              defaultValues={{
                                name: webhook.name,
                                isActive: webhook.isActive,
                                authCode: webhook.authCode || undefined,
                                transformCode:
                                  webhook.transformCode || undefined,
                              }}
                            />
                          </DialogContent>
                        </Dialog>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => setWebhookToDelete(webhook.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <AlertDialogConfirmation
        open={!!webhookToDelete}
        onOpenChange={() => setWebhookToDelete(null)}
        onConfirm={handleDelete}
        title="Delete Webhook"
        description="Are you sure you want to delete this webhook? This action cannot be undone."
        confirmText="Delete"
        cancelText="Cancel"
      />
    </>
  )
}
