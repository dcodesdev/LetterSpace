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
} from "@repo/ui"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { trpc } from "@/trpc"
import { useSession } from "@/hooks"
import { toast } from "sonner"
import { Save } from "lucide-react"

const profileSettingsSchema = z.object({
  name: z.string().min(1, "Name is required."),
  email: z.string().email("Invalid email address."),
})

export function ProfileSettings() {
  const { user: { data: user } = {} } = useSession() // Assuming updateUser updates session
  const utils = trpc.useUtils()

  const form = useForm<z.infer<typeof profileSettingsSchema>>({
    resolver: zodResolver(profileSettingsSchema),
    defaultValues: {
      name: "",
      email: "",
    },
  })

  const { isDirty } = form.formState

  useEffect(() => {
    if (user) {
      form.reset({
        name: user.name ?? "",
        email: user.email ?? "",
      })
    }
  }, [user, form])

  const updateProfileMutation = trpc.user.updateProfile.useMutation({
    onSuccess: async (data) => {
      if (data?.user) {
        form.reset({
          name: data.user.name ?? "",
          email: data.user.email ?? "",
        })
        toast.success("Profile updated successfully.")
      }
      utils.user.me.invalidate() // Invalidate a query like 'user.me' that fetches current user
    },
    onError: (error) => {
      toast.error(error.message || "Failed to update profile.")
    },
  })

  const onSubmit = (values: z.infer<typeof profileSettingsSchema>) => {
    updateProfileMutation.mutate(values)
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>Profile Settings</CardTitle>
          <div className="flex items-center gap-4">
            {isDirty && (
              <p className="text-sm text-muted-foreground">Unsaved changes</p>
            )}
            <Button
              type="submit"
              form="profile-settings-form"
              disabled={updateProfileMutation.isPending || !isDirty}
              loading={updateProfileMutation.isPending}
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
            id="profile-settings-form"
            onSubmit={form.handleSubmit(onSubmit)}
            className="space-y-6"
          >
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Full Name</FormLabel>
                  <FormControl>
                    <Input placeholder="Your Name" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Email Address</FormLabel>
                  <FormControl>
                    <Input
                      type="email"
                      placeholder="your@email.com"
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
