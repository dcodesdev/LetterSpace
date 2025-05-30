import { useState } from "react"
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
  Form,
  FormField,
  FormItem,
  FormLabel,
  FormControl,
  Input,
  FormMessage,
  FormDescription,
  Switch,
  Textarea,
  Badge,
} from "@repo/ui"
import { Plus, Webhook, Trash2, Edit } from "lucide-react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { trpc } from "@/trpc"
import { useSession } from "@/hooks"
import { toast } from "sonner"
import { format } from "date-fns"
import dayjs from "dayjs"
import relativeTime from "dayjs/plugin/relativeTime"
import { AlertDialogConfirmation, CopyButton } from "@/components"

dayjs.extend(relativeTime)

const webhookSchema = z.object({
  name: z.string().min(1, "Name is required"),
  url: z.string().url("Must be a valid URL"),
  isActive: z.boolean(),
  authCode: z.string().optional(),
  transformCode: z.string().optional(),
})

type WebhookFormData = z.infer<typeof webhookSchema>

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

  const form = useForm<WebhookFormData>({
    resolver: zodResolver(webhookSchema),
    defaultValues: {
      name: "",
      url: "",
      isActive: true,
      authCode: "",
      transformCode: "",
    },
  })

  const utils = trpc.useUtils()

  const createWebhook = trpc.webhook.create.useMutation({
    onSuccess: () => {
      toast.success("Webhook created successfully")
      setIsCreating(false)
      form.reset()
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
      form.reset()
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

  const onSubmit = (values: WebhookFormData) => {
    if (!organization?.id) return

    if (editingWebhook) {
      updateWebhook.mutate({
        id: editingWebhook,
        organizationId: organization.id,
        ...values,
      })
    } else {
      createWebhook.mutate({
        organizationId: organization.id,
        ...values,
      })
    }
  }

  const handleEdit = (webhook: {
    id: string
    name: string
    url: string
    isActive: boolean
    authCode?: string | null
    transformCode?: string | null
  }) => {
    setEditingWebhook(webhook.id)
    form.reset({
      name: webhook.name,
      url: webhook.url,
      isActive: webhook.isActive,
      authCode: webhook.authCode || "",
      transformCode: webhook.transformCode || "",
    })
    setIsCreating(true)
  }

  const handleDelete = () => {
    if (!webhookToDelete || !organization?.id) return
    deleteWebhook.mutate({
      id: webhookToDelete,
      organizationId: organization.id,
    })
  }

  const getWebhookUrl = (webhookId: string) => {
    const baseUrl = window.location.origin
    return `${baseUrl}/webhook/${webhookId}`
  }

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Webhooks</CardTitle>
              <CardDescription>
                Configure webhooks to receive SMTP server events and update
                message statuses automatically
              </CardDescription>
            </div>
            <Dialog
              open={isCreating}
              onOpenChange={(open) => {
                if (!open) {
                  form.reset()
                  setEditingWebhook(null)
                }
                setIsCreating(open)
              }}
            >
              <DialogTrigger asChild>
                <Button>
                  <Plus className="mr-2 h-4 w-4" />
                  Add Webhook
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-[700px] max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>
                    {editingWebhook ? "Edit Webhook" : "Add Webhook"}
                  </DialogTitle>
                  <DialogDescription>
                    {editingWebhook
                      ? "Update your webhook configuration"
                      : "Create a new webhook endpoint to receive SMTP server events"}
                  </DialogDescription>
                </DialogHeader>
                <Form {...form}>
                  <form
                    onSubmit={form.handleSubmit(onSubmit)}
                    className="space-y-4"
                  >
                    <FormField
                      control={form.control}
                      name="name"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Name</FormLabel>
                          <FormControl>
                            <Input placeholder="My SMTP Webhook" {...field} />
                          </FormControl>
                          <FormDescription>
                            A descriptive name for this webhook
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="url"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>URL</FormLabel>
                          <FormControl>
                            <Input
                              placeholder="https://smtp-provider.com/webhook"
                              {...field}
                            />
                          </FormControl>
                          <FormDescription>
                            The URL where your SMTP provider will send webhook
                            events
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="authCode"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Authorization Code (Optional)</FormLabel>
                          <FormControl>
                            <Textarea
                              placeholder={`// JavaScript code to authorize webhook requests
// Return true to allow, false to deny
// Available variables: request (headers, body, query, params)

// Example:
const signature = request.headers['x-signature'];
const secret = 'your-webhook-secret';
// Verify signature logic here
return signature === expectedSignature;`}
                              className="font-mono text-sm"
                              rows={8}
                              {...field}
                            />
                          </FormControl>
                          <FormDescription>
                            JavaScript code to verify webhook authenticity.
                            Return true to allow the request.
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="transformCode"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Transform Code (Optional)</FormLabel>
                          <FormControl>
                            <Textarea
                              placeholder={`// JavaScript code to transform webhook payload
// Return an object with messageId and event fields
// Available variables: payload, headers, query

// Example:
return {
  messageId: payload.message_id,
  event: payload.event_type,
  reason: payload.reason
};`}
                              className="font-mono text-sm"
                              rows={8}
                              {...field}
                            />
                          </FormControl>
                          <FormDescription>
                            JavaScript code to transform the webhook payload to
                            LetterSpace format. Must return an object with
                            messageId and event fields.
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="isActive"
                      render={({ field }) => (
                        <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                          <div className="space-y-0.5">
                            <FormLabel className="text-base">Active</FormLabel>
                            <FormDescription>
                              Enable this webhook to receive events
                            </FormDescription>
                          </div>
                          <FormControl>
                            <Switch
                              checked={field.value}
                              onCheckedChange={field.onChange}
                            />
                          </FormControl>
                        </FormItem>
                      )}
                    />

                    <div className="flex justify-end gap-4">
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => setIsCreating(false)}
                      >
                        Cancel
                      </Button>
                      <Button
                        type="submit"
                        disabled={
                          createWebhook.isPending || updateWebhook.isPending
                        }
                      >
                        {editingWebhook ? "Update" : "Create"}
                      </Button>
                    </div>
                  </form>
                </Form>
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
                  receiving SMTP server events and automatically update message
                  statuses.
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
                  <TableHead></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {webhooks?.map((webhook) => (
                  <TableRow key={webhook.id}>
                    <TableCell>
                      <div>
                        <div className="font-medium">{webhook.name}</div>
                        <div className="text-sm text-muted-foreground">
                          {webhook.url}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <code className="text-xs bg-muted px-2 py-1 rounded">
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
                      <div className="space-y-1">
                        <div className="text-sm">
                          {format(new Date(webhook.createdAt), "PPP")}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {dayjs(webhook.createdAt).fromNow()}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleEdit(webhook)}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
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
