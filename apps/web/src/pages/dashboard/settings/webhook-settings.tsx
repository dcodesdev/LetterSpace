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
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
  Switch,
} from "@repo/ui"
import { Plus, Webhook } from "lucide-react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { trpc } from "@/trpc"
import { useSession } from "@/hooks"
import { toast } from "sonner"

const createWebhookSchema = z.object({
  name: z.string().min(1, "Name is required"),
  url: z.string().url("Must be a valid URL"),
  events: z.array(z.string()).min(1, "At least one event must be selected"),
  isActive: z.boolean(),
  secret: z.string().min(1, "Secret is required"),
})

export function WebhookSettings() {
  const { organization } = useSession()
  const [isCreating, setIsCreating] = useState(false)

  const { data: webhooks } = trpc.settings.listWebhooks.useQuery(
    {
      organizationId: organization?.id ?? "",
    },
    {
      enabled: !!organization?.id,
    }
  )

  const form = useForm<z.infer<typeof createWebhookSchema>>({
    resolver: zodResolver(createWebhookSchema),
    defaultValues: {
      name: "",
      url: "",
      events: [],
      isActive: true,
      secret: "",
    },
  })

  const utils = trpc.useUtils()

  const createWebhook = trpc.settings.createWebhook.useMutation({
    onSuccess: () => {
      toast.success("Webhook created successfully")
      setIsCreating(false)
      form.reset()
      utils.settings.listWebhooks.invalidate()
    },
    onError: (error) => {
      toast.error(error.message)
    },
  })

  // const deleteWebhook = trpc.settings.deleteWebhook.useMutation({
  //   onSuccess: () => {
  //     toast.success("Webhook deleted")
  //     utils.settings.listWebhooks.invalidate()
  //   },
  //   onError: (error) => {
  //     toast.error(error.message)
  //   },
  // })

  const onSubmit = (values: z.infer<typeof createWebhookSchema>) => {
    if (!organization?.id) return
    createWebhook.mutate({
      organizationId: organization.id,
      ...values,
    })
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Webhooks</CardTitle>
            <CardDescription>
              Manage webhook endpoints for real-time event notifications
            </CardDescription>
          </div>
          <Dialog
            open={isCreating}
            onOpenChange={(open) => {
              if (!open) {
                form.reset()
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
            <DialogContent className="sm:max-w-[600px]">
              <DialogHeader>
                <DialogTitle>Add Webhook</DialogTitle>
                <DialogDescription>
                  Create a new webhook endpoint to receive event notifications
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
                          <Input placeholder="My Webhook" {...field} />
                        </FormControl>
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
                            placeholder="https://example.com/webhook"
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="events"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Events</FormLabel>
                        <Select
                          onValueChange={(value) =>
                            field.onChange([...field.value, value])
                          }
                        >
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select events" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="email.sent">
                              Email Sent
                            </SelectItem>
                            <SelectItem value="email.delivered">
                              Email Delivered
                            </SelectItem>
                            <SelectItem value="email.failed">
                              Email Failed
                            </SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="secret"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Secret</FormLabel>
                        <FormControl>
                          <Input
                            type="password"
                            placeholder="Webhook secret"
                            {...field}
                          />
                        </FormControl>
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
                          <CardDescription>
                            Receive events for this webhook
                          </CardDescription>
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
                    <Button type="submit" disabled={createWebhook.isPending}>
                      Create
                    </Button>
                  </div>
                </form>
              </Form>
            </DialogContent>
          </Dialog>
        </div>
      </CardHeader>
      <CardContent>
        {!webhooks?.length ? (
          <div className="flex min-h-[400px] flex-col items-center justify-center rounded-lg border border-dashed">
            <div className="mx-auto flex max-w-[420px] flex-col items-center justify-center text-center">
              <div className="flex h-20 w-20 items-center justify-center rounded-full bg-muted">
                <Webhook className="h-10 w-10" />
              </div>
              <h3 className="mt-4 text-lg font-semibold">No webhooks</h3>
              <p className="mb-4 mt-2 text-sm text-muted-foreground">
                You haven't created any webhooks yet. Add one to start receiving
                event notifications.
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
                <TableHead>URL</TableHead>
                <TableHead>Events</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Created</TableHead>
                <TableHead></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {/* {webhooks?.map((webhook) => (
                <TableRow key={webhook.id}>
                  <TableCell>{webhook.name}</TableCell>
                  <TableCell className="font-mono text-sm">
                    {webhook.url}
                  </TableCell>
                  <TableCell>{webhook.events.join(", ")}</TableCell>
                  <TableCell>
                    {webhook.isActive ? (
                      <span className="text-emerald-600">Active</span>
                    ) : (
                      <span className="text-gray-500">Inactive</span>
                    )}
                  </TableCell>
                  <TableCell>
                    <div className="space-y-1">
                      <div>{format(new Date(webhook.createdAt), "PPP")}</div>
                      <div className="text-sm text-muted-foreground">
                        {dayjs(webhook.createdAt).fromNow()}
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => {
                        if (
                          window.confirm(
                            "Are you sure you want to delete this webhook?"
                          )
                        ) {
                          deleteWebhook.mutate({
                            id: webhook.id,
                            organizationId: organization?.id ?? "",
                          })
                        }
                      }}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))} */}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  )
}
