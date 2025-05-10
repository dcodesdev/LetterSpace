import { useEffect } from "react"
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  Button,
  Form,
  FormField,
  FormItem,
  FormLabel,
  FormControl,
  Input,
  FormMessage,
  FormDescription,
} from "@repo/ui"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { trpc } from "@/trpc"
import { useSession } from "@/hooks"
import { toast } from "sonner"
import { LinkIcon, Save } from "lucide-react"
import { WithTooltip, FormControlledInput } from "@/components"

const generalSettingsSchema = z.object({
  defaultFromEmail: z.string().email().optional().or(z.literal("")),
  defaultFromName: z.string().optional(),
  baseURL: z.string().url().optional().or(z.literal("")),
  cleanupInterval: z.coerce.number().int().min(1).optional(),
})

export function GeneralSettings() {
  const { organization } = useSession()
  const utils = trpc.useUtils()

  const { data: settings } = trpc.settings.getGeneral.useQuery(
    {
      organizationId: organization?.id ?? "",
    },
    {
      enabled: !!organization?.id,
      staleTime: 1000 * 60 * 5, // 5 minutes
    }
  )

  const form = useForm({
    resolver: zodResolver(generalSettingsSchema),
    defaultValues: {
      defaultFromEmail: "",
      defaultFromName: "",
      baseURL: "",
      cleanupInterval: 90,
    },
  })

  const { isDirty } = form.formState

  useEffect(() => {
    if (settings) {
      form.reset({
        defaultFromEmail: settings.defaultFromEmail ?? "",
        defaultFromName: settings.defaultFromName ?? "",
        baseURL: settings.baseURL ?? "",
        cleanupInterval: settings.cleanupInterval ?? 90,
      })
    }
  }, [settings, form])

  const updateSettings = trpc.settings.updateGeneral.useMutation({
    onSuccess: ({ settings }) => {
      form.reset({
        defaultFromEmail: settings.defaultFromEmail ?? "",
        defaultFromName: settings.defaultFromName ?? "",
        baseURL: settings.baseURL ?? "",
        cleanupInterval: settings.cleanupInterval ?? 90,
      })
      utils.settings.getGeneral.invalidate()
    },
    onError: (error) => {
      toast.error(error.message)
    },
  })

  const onSubmit = (values: z.infer<typeof generalSettingsSchema>) => {
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
            <CardTitle>General Settings</CardTitle>
          </div>
          <div className="flex items-center gap-4">
            {isDirty && (
              <p className="text-sm text-muted-foreground">Unsaved changes</p>
            )}
            <Button
              type="submit"
              form="general-settings-form"
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
            id="general-settings-form"
            onSubmit={form.handleSubmit(onSubmit)}
            className="space-y-8"
          >
            <div className="grid gap-4 md:grid-cols-2">
              <FormField
                control={form.control}
                name="defaultFromEmail"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Default From Email</FormLabel>
                    <FormControl>
                      <Input
                        type="email"
                        placeholder="default@example.com"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="defaultFromName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Default From Name</FormLabel>
                    <FormControl>
                      <Input placeholder="Default Sender Name" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="baseURL"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Base URL</FormLabel>
                  <FormControl>
                    <div className="flex items-center gap-2">
                      <Input placeholder="https://your-domain.com" {...field} />
                      <WithTooltip content="Set current domain">
                        <Button
                          onClick={() =>
                            form.setValue("baseURL", window.location.origin, {
                              shouldDirty: true,
                            })
                          }
                          variant="outline"
                          size="icon"
                          type="button"
                        >
                          <LinkIcon className="w-4 h-4" />
                        </Button>
                      </WithTooltip>
                    </div>
                  </FormControl>
                  <FormDescription>
                    The base URL for your application (used for tracking links
                    and unsubscribe pages)
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormControlledInput
              control={form.control}
              name="cleanupInterval"
              label="Cleanup Interval (days)"
              description="Number of days after which to cleanup old data (e.g. sent messages, logs). Default is 90 days."
              inputProps={{
                type: "number",
                placeholder: "90",
              }}
            />
          </form>
        </Form>
      </CardContent>
    </Card>
  )
}
