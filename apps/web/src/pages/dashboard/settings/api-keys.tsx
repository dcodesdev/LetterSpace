import { useState } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import {
  Button,
  Calendar,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  Input,
  Popover,
  PopoverContent,
  PopoverTrigger,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  cn,
} from "@repo/ui"
import { format } from "date-fns"
import dayjs from "dayjs"
import relativeTime from "dayjs/plugin/relativeTime"
import { CalendarIcon, Eye, EyeOff, Key, Plus, Trash2 } from "lucide-react"
import { toast } from "sonner"
import { z } from "zod"
import { CopyButton, Loader } from "@/components"
import { AlertDialogConfirmation } from "@/components"
import { useSession } from "@/hooks"
import { trpc } from "@/trpc"

// Initialize dayjs plugins
dayjs.extend(relativeTime)

const createApiKeySchema = z.object({
  name: z.string().min(1, "Name is required"),
  expiresAt: z.date().optional(),
})

export function ApiKeys() {
  const { organization } = useSession()
  const [isCreating, setIsCreating] = useState(false)
  const [newKey, setNewKey] = useState<string | null>(null)
  const [showKey, setShowKey] = useState(false)

  const { data: apiKeys, isLoading } = trpc.settings.listApiKeys.useQuery(
    {
      organizationId: organization?.id ?? "",
    },
    {
      enabled: !!organization?.id,
    }
  )

  const form = useForm<z.infer<typeof createApiKeySchema>>({
    resolver: zodResolver(createApiKeySchema),
    defaultValues: {
      name: "",
      expiresAt: undefined,
    },
  })

  const utils = trpc.useUtils()

  const createApiKey = trpc.settings.createApiKey.useMutation({
    onSuccess: ({ key }) => {
      setNewKey(key)
      utils.settings.listApiKeys.invalidate()
    },
    onError: (error) => {
      toast.error(error.message)
    },
  })

  const deleteApiKey = trpc.settings.deleteApiKey.useMutation({
    onSuccess: () => {
      toast.success("API key deleted")
      utils.settings.listApiKeys.invalidate()
    },
    onError: (error) => {
      toast.error(error.message)
    },
  })

  const onSubmit = (values: z.infer<typeof createApiKeySchema>) => {
    if (!organization?.id) return
    createApiKey.mutate({
      organizationId: organization.id,
      name: values.name,
      expiresAt: values.expiresAt ? values.expiresAt.toISOString() : undefined,
    })
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>API Keys</CardTitle>
          </div>
          <Dialog
            open={isCreating}
            onOpenChange={(open) => {
              if (!open) {
                setNewKey(null)
                form.reset()
              }
              setIsCreating(open)
            }}
          >
            <DialogTrigger asChild>
              <Button>
                <Plus className="mr-2 h-4 w-4" />
                Create API Key
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[600px]">
              <DialogHeader>
                <DialogTitle>Create API Key</DialogTitle>
                <DialogDescription>
                  Create a new API key for accessing the API
                </DialogDescription>
              </DialogHeader>
              {newKey ? (
                <div className="space-y-4">
                  <div className="rounded-lg border p-4">
                    <p className="text-sm font-medium">Your API Key:</p>
                    <div className="mt-2 flex items-center gap-2">
                      <code
                        className={cn(
                          "flex-1 break-all rounded bg-muted px-2 py-1 text-sm",
                          !showKey && "blur-sm select-none"
                        )}
                      >
                        {newKey}
                      </code>

                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => setShowKey(!showKey)}
                      >
                        {showKey ? (
                          <EyeOff className="h-4 w-4" />
                        ) : (
                          <Eye className="h-4 w-4" />
                        )}
                      </Button>

                      <CopyButton
                        onCopy={() => navigator.clipboard.writeText(newKey)}
                      />
                    </div>
                    <p className="mt-2 text-sm text-muted-foreground">
                      Make sure to copy your API key now. You won't be able to
                      see it again!
                    </p>
                  </div>
                  <Button
                    onClick={() => {
                      setIsCreating(false)
                      setNewKey(null)
                      setShowKey(false)
                      form.reset()
                    }}
                  >
                    Done
                  </Button>
                </div>
              ) : (
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
                            <Input placeholder="My API Key" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="expiresAt"
                      render={({ field }) => (
                        <FormItem className="flex flex-col">
                          <FormLabel>Expires At (Optional)</FormLabel>
                          <Popover>
                            <PopoverTrigger asChild>
                              <FormControl>
                                <Button
                                  variant="outline"
                                  className={cn(
                                    "w-full pl-3 text-left font-normal",
                                    !field.value && "text-muted-foreground"
                                  )}
                                >
                                  {field.value ? (
                                    format(field.value, "PPP")
                                  ) : (
                                    <span>Pick a date</span>
                                  )}
                                  <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                                </Button>
                              </FormControl>
                            </PopoverTrigger>
                            <PopoverContent
                              className="w-auto p-0"
                              align="start"
                            >
                              <Calendar
                                mode="single"
                                selected={field.value}
                                onSelect={field.onChange}
                                disabled={(date) =>
                                  date < new Date() ||
                                  date < new Date("1900-01-01")
                                }
                                initialFocus
                              />
                            </PopoverContent>
                          </Popover>
                          <FormDescription>
                            When this API key should expire. If not set, the key
                            will never expire.
                          </FormDescription>
                          <FormMessage />
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
                      <Button type="submit" disabled={createApiKey.isPending}>
                        Create
                      </Button>
                    </div>
                  </form>
                </Form>
              )}
            </DialogContent>
          </Dialog>
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="flex min-h-[400px] flex-col items-center justify-center rounded-lg border border-dashed">
            <Loader />
          </div>
        ) : !apiKeys?.length ? (
          <div className="flex min-h-[400px] flex-col items-center justify-center rounded-lg border border-dashed">
            <div className="mx-auto flex max-w-[420px] flex-col items-center justify-center text-center">
              <div className="flex h-20 w-20 items-center justify-center rounded-full bg-muted">
                <Key className="h-10 w-10" />
              </div>
              <h3 className="mt-4 text-lg font-semibold">No API keys</h3>
              <p className="mb-4 mt-2 text-sm text-muted-foreground">
                You haven't created any API keys yet. Create one to get started
                with the API.
              </p>
              <Button onClick={() => setIsCreating(true)}>
                <Plus className="mr-2 h-4 w-4" />
                Create API Key
              </Button>
            </div>
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Last Used</TableHead>
                <TableHead>Expires</TableHead>
                <TableHead>Created</TableHead>
                <TableHead></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {apiKeys?.map((key) => (
                <TableRow key={key.id}>
                  <TableCell>{key.name}</TableCell>
                  <TableCell>
                    {key.lastUsed ? dayjs(key.lastUsed).fromNow() : "Never"}
                  </TableCell>
                  <TableCell>
                    {key.expiresAt ? (
                      <div className="space-y-1">
                        <div>{format(new Date(key.expiresAt), "PPP")}</div>
                        <div className="text-sm text-muted-foreground">
                          {dayjs(key.expiresAt).fromNow()}
                        </div>
                      </div>
                    ) : (
                      "Never"
                    )}
                  </TableCell>
                  <TableCell>
                    <div className="space-y-1">
                      <div>{format(new Date(key.createdAt), "PPP")}</div>
                      <div className="text-sm text-muted-foreground">
                        {dayjs(key.createdAt).fromNow()}
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <AlertDialogConfirmation
                      trigger={
                        <Button variant="ghost" size="icon">
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      }
                      title="Delete API Key"
                      description="Are you sure you want to delete this API key? This action cannot be undone."
                      confirmText="Delete"
                      variant="destructive"
                      onConfirm={() => {
                        deleteApiKey.mutate({
                          id: key.id,
                          organizationId: organization?.id ?? "",
                        })
                      }}
                    />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  )
}
