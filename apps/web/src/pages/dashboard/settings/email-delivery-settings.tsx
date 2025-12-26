import { useEffect, useState } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import {
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  Input,
  Separator,
} from "@repo/ui"
import { Save } from "lucide-react"
import { toast } from "sonner"
import { z } from "zod"
import { useSession } from "@/hooks"
import { trpc } from "@/trpc"

const emailSchema = z.object({
  rateLimit: z.coerce.number().min(1, "Rate limit is required"),
  rateWindow: z.coerce.number().min(1, "Rate window is required"),
  maxRetries: z.coerce.number().min(0, "Max retries must be 0 or greater"),
  retryDelay: z.coerce.number().min(1, "Retry delay is required"),
  concurrency: z.coerce.number().min(1, "Concurrency must be at least 1"),
  connectionTimeout: z.coerce
    .number()
    .min(1, "Connection timeout must be at least 1"),
})

type EmailSettings = z.infer<typeof emailSchema>

export function EmailSettings() {
  const { organization } = useSession()
  const utils = trpc.useUtils()
  const [initialLoad, setInitialLoad] = useState(true)

  const { data: settings } = trpc.settings.getEmailDelivery.useQuery(
    {
      organizationId: organization?.id ?? "",
    },
    {
      enabled: !!organization?.id,
      staleTime: 1000 * 60 * 5, // 5 minutes
    }
  )

  const form = useForm<EmailSettings>({
    resolver: zodResolver(emailSchema),
    defaultValues: {
      rateLimit: 100,
      rateWindow: 3600,
      maxRetries: 3,
      retryDelay: 300,
      concurrency: 5,
      connectionTimeout: 30000,
    },
  })

  const { isDirty } = form.formState

  useEffect(() => {
    if (!initialLoad || !settings) return

    form.reset({
      rateLimit: settings.rateLimit,
      rateWindow: settings.rateWindow,
      maxRetries: settings.maxRetries,
      retryDelay: settings.retryDelay,
      concurrency: settings.concurrency,
      connectionTimeout: settings.connectionTimeout,
    })
    setInitialLoad(false)
  }, [settings, form, initialLoad])

  const updateSettings = trpc.settings.updateEmailDelivery.useMutation({
    onSuccess: ({ settings }) => {
      form.reset(settings)
      utils.settings.getEmailDelivery.invalidate()
    },
    onError: (error) => {
      toast.error(error.message)
    },
  })

  function onSubmit(values: EmailSettings) {
    if (!organization?.id) return
    updateSettings.mutate({
      organizationId: organization.id,
      ...values,
    })
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Email Delivery Settings</CardTitle>
          </div>
          <div className="flex items-center gap-4">
            {isDirty && (
              <p className="text-sm text-muted-foreground">Unsaved changes</p>
            )}
            <Button
              type="submit"
              form="email-form"
              disabled={updateSettings.isPending}
              loading={updateSettings.isPending}
            >
              <Save className="h-4 w-4" />
              Save
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form
            id="email-form"
            onSubmit={form.handleSubmit(onSubmit)}
            className="space-y-8"
          >
            {/* Rate Limiting */}
            <div>
              <h3 className="text-lg font-medium">Rate Limiting</h3>
              <p className="text-sm text-muted-foreground mb-4">
                Control how many emails can be sent within a time period
              </p>
              <Separator className="my-4" />
              <div className="grid gap-4 md:grid-cols-2">
                <FormField
                  control={form.control}
                  name="rateLimit"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Rate Limit</FormLabel>
                      <FormControl>
                        <Input type="number" {...field} />
                      </FormControl>
                      <FormDescription>
                        Maximum number of emails to send within the rate window
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="rateWindow"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Rate Window (seconds)</FormLabel>
                      <FormControl>
                        <Input type="number" {...field} />
                      </FormControl>
                      <FormDescription>
                        Time window in seconds for the rate limit
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </div>

            {/* Retry Settings */}
            <div>
              <h3 className="text-lg font-medium">Retry Settings</h3>
              <p className="text-sm text-muted-foreground mb-4">
                Configure how failed emails should be retried
              </p>
              <Separator className="my-4" />
              <div className="grid gap-4 md:grid-cols-2">
                <FormField
                  control={form.control}
                  name="maxRetries"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Max Retries</FormLabel>
                      <FormControl>
                        <Input type="number" {...field} />
                      </FormControl>
                      <FormDescription>
                        Maximum number of retry attempts for failed emails
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="retryDelay"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Retry Delay (seconds)</FormLabel>
                      <FormControl>
                        <Input type="number" {...field} />
                      </FormControl>
                      <FormDescription>
                        Delay between retry attempts in seconds
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </div>

            {/* Advanced Settings */}
            <div>
              <h3 className="text-lg font-medium">Advanced Settings</h3>
              <p className="text-sm text-muted-foreground mb-4">
                Additional configuration options for email delivery
              </p>
              <Separator className="my-4" />
              <div className="grid gap-4 md:grid-cols-2">
                <FormField
                  control={form.control}
                  name="concurrency"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Concurrency</FormLabel>
                      <FormControl>
                        <Input type="number" {...field} />
                      </FormControl>
                      <FormDescription>
                        Number of emails to send in parallel
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="connectionTimeout"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Connection Timeout (ms)</FormLabel>
                      <FormControl>
                        <Input type="number" {...field} />
                      </FormControl>
                      <FormDescription>
                        Time in milliseconds to wait for SMTP connection
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </div>
          </form>
        </Form>
      </CardContent>
    </Card>
  )
}
