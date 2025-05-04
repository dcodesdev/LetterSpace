import { zodResolver } from "@hookform/resolvers/zod"
import { useForm } from "react-hook-form"
import { z } from "zod"
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Switch,
  Separator,
} from "@repo/ui"
import { toast } from "sonner"
import { trpc } from "@/trpc"
import { useSession } from "@/hooks"
import { TestSmtpDialog } from "./test-smtp-dialog"
import { useEffect, useState } from "react"
import { Save } from "lucide-react"

const smtpSchema = z.object({
  host: z.string().min(1, "SMTP host is required"),
  port: z.coerce.number().min(1, "Port is required"),
  username: z.string().min(1, "Username is required"),
  password: z.string().min(1, "Password is required"),
  fromEmail: z.string().email("Invalid email address"),
  fromName: z.string().min(1, "From name is required"),
  secure: z.boolean(),
  encryption: z.enum(["STARTTLS", "SSL_TLS", "NONE"]),
})

type SmtpSettings = z.infer<typeof smtpSchema>

export function SmtpSettings() {
  const { organization } = useSession()
  const utils = trpc.useUtils()

  const { data: settings } = trpc.settings.getSmtp.useQuery(
    {
      organizationId: organization?.id ?? "",
    },
    {
      enabled: !!organization?.id,
      staleTime: 1000 * 60 * 5, // Consider data fresh for 5 minutes
    }
  )

  const form = useForm<SmtpSettings>({
    resolver: zodResolver(smtpSchema),
    defaultValues: {
      host: "",
      port: 587,
      username: "",
      password: "",
      fromEmail: "",
      fromName: "",
      secure: true,
      encryption: "STARTTLS",
    },
  })

  const { isDirty } = form.formState
  const [initialLoad, setInitialLoad] = useState(true)

  useEffect(() => {
    if (!settings || !initialLoad) return

    form.reset({
      host: settings.host,
      port: settings.port,
      username: settings.username,
      password: settings.password,
      fromEmail: settings.fromEmail ?? "",
      fromName: settings.fromName ?? "",
      secure: settings.secure,
      encryption: settings.encryption,
    })
    setInitialLoad(false)
  }, [settings, form, initialLoad])

  const updateSettings = trpc.settings.updateSmtp.useMutation({
    onSuccess: ({ settings }) => {
      utils.settings.getSmtp.invalidate()
      form.reset({
        ...settings,
        fromEmail: settings.fromEmail ?? "",
        fromName: settings.fromName ?? "",
      })
    },
    onError: (error) => {
      toast.error(error.message)
    },
  })

  function onSubmit(values: SmtpSettings) {
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
            <CardTitle>SMTP Settings</CardTitle>
          </div>
          <div className="flex items-center gap-4">
            {isDirty && (
              <p className="text-sm text-muted-foreground">Unsaved changes</p>
            )}
            <Button
              type="submit"
              form="smtp-form"
              disabled={updateSettings.isPending}
              loading={updateSettings.isPending}
            >
              <Save className="h-4 w-4" />
              Save
            </Button>
            <TestSmtpDialog
              organizationId={organization?.id ?? ""}
              trigger={
                <Button variant="outline" disabled={!settings}>
                  Test Settings
                </Button>
              }
            />
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form
            id="smtp-form"
            onSubmit={form.handleSubmit(onSubmit)}
            className="space-y-8"
          >
            {/* Server Settings */}
            <div>
              <h3 className="text-lg font-medium">Server Settings</h3>
              <p className="text-sm text-muted-foreground mb-4">
                Configure your SMTP server connection details
              </p>
              <Separator className="my-4" />
              <div className="grid gap-4 md:grid-cols-2">
                <FormField
                  control={form.control}
                  name="host"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>SMTP Host</FormLabel>
                      <FormControl>
                        <Input placeholder="smtp.example.com" {...field} />
                      </FormControl>
                      <FormDescription>
                        The hostname of your SMTP server
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="port"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Port</FormLabel>
                      <FormControl>
                        <Input type="number" placeholder="587" {...field} />
                      </FormControl>
                      <FormDescription>
                        Common ports: 25, 465, 587, 2525
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="encryption"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Encryption</FormLabel>
                      <Select
                        onValueChange={field.onChange}
                        defaultValue={field.value}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select encryption" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="STARTTLS">STARTTLS</SelectItem>
                          <SelectItem value="SSL/TLS">SSL/TLS</SelectItem>
                          <SelectItem value="None">None</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormDescription>
                        Choose the encryption method for your SMTP connection
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="secure"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                      <div className="space-y-0.5">
                        <FormLabel className="text-base">
                          Require Secure Connection
                        </FormLabel>
                        <FormDescription>
                          Use TLS when connecting to server
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
              </div>
            </div>

            {/* Authentication */}
            <div>
              <h3 className="text-lg font-medium">Authentication</h3>
              <p className="text-sm text-muted-foreground mb-4">
                Credentials used to authenticate with your SMTP server
              </p>
              <Separator className="my-4" />
              <div className="grid gap-4 md:grid-cols-2">
                <FormField
                  control={form.control}
                  name="username"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Username</FormLabel>
                      <FormControl>
                        <Input {...field} />
                      </FormControl>
                      <FormDescription>
                        Your SMTP server username
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="password"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Password</FormLabel>
                      <FormControl>
                        <Input type="password" {...field} />
                      </FormControl>
                      <FormDescription>
                        Your SMTP server password
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </div>

            {/* Sender Information */}
            <div>
              <h3 className="text-lg font-medium">Sender Information</h3>
              <p className="text-sm text-muted-foreground mb-4">
                Default sender details for outgoing emails
              </p>
              <Separator className="my-4" />
              <div className="grid gap-4 md:grid-cols-2">
                <FormField
                  control={form.control}
                  name="fromEmail"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>From Email</FormLabel>
                      <FormControl>
                        <Input
                          type="email"
                          placeholder="noreply@example.com"
                          {...field}
                        />
                      </FormControl>
                      <FormDescription>
                        The email address emails will be sent from
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="fromName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>From Name</FormLabel>
                      <FormControl>
                        <Input placeholder="Your Company Name" {...field} />
                      </FormControl>
                      <FormDescription>
                        The name that will appear in the from field
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
