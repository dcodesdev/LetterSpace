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
  Textarea,
} from "@repo/ui"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { trpc } from "@/trpc"
import { useSession } from "@/hooks"
import { toast } from "sonner"
import { Save } from "lucide-react"

const organizationSettingsSchema = z.object({
  name: z.string().min(1, "Organization name is required."),
  description: z.string().optional(),
})

export function OrganizationSettings() {
  const { organization } = useSession()
  const utils = trpc.useUtils()

  const form = useForm<z.infer<typeof organizationSettingsSchema>>({
    resolver: zodResolver(organizationSettingsSchema),
    defaultValues: {
      name: "",
      description: "",
    },
  })

  const { isDirty } = form.formState

  useEffect(() => {
    if (organization) {
      form.reset({
        name: organization.name ?? "",
        description: organization.description ?? "",
      })
    }
  }, [organization, form])

  const updateMutation = trpc.organization.update.useMutation({
    onSuccess: async (data) => {
      if (data?.organization) {
        form.reset({
          name: data.organization.name ?? "",
          description: data.organization.description ?? "",
        })
        toast.success("Organization settings updated successfully.")
      }
      utils.organization.getById.invalidate({ id: organization?.id ?? "" })
    },
    onError: (error) => {
      toast.error(error.message || "Failed to update organization settings.")
    },
  })

  const onSubmit = (values: z.infer<typeof organizationSettingsSchema>) => {
    if (!organization?.id) return
    updateMutation.mutate({
      id: organization.id,
      name: values.name,
      description: values.description,
    })
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>Organization Details</CardTitle>
          <div className="flex items-center gap-4">
            {isDirty && (
              <p className="text-sm text-muted-foreground">Unsaved changes</p>
            )}
            <Button
              type="submit"
              form="organization-settings-form"
              disabled={updateMutation.isPending || !isDirty}
              loading={updateMutation.isPending}
            >
              <Save className="mr-2 h-4 w-4" />
              Save Changes
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form
            id="organization-settings-form"
            onSubmit={form.handleSubmit(onSubmit)}
            className="space-y-6"
          >
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Organization Name</FormLabel>
                  <FormControl>
                    <Input placeholder="Your Company, Inc." {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Description</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Tell us a little bit about your organization."
                      className="resize-none"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </form>
        </Form>
      </CardContent>
    </Card>
  )
}
