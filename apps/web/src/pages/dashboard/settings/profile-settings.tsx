import { useEffect } from "react"
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
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  Input,
} from "@repo/ui"
import Cookies from "js-cookie"
import { KeyRound, Save } from "lucide-react"
import { toast } from "sonner"
import { z } from "zod"
import { useSession } from "@/hooks"
import { trpc } from "@/trpc"

const profileSettingsSchema = z.object({
  name: z.string().min(1, "Name is required."),
  email: z.string().email("Invalid email address."),
})

const changePasswordSchema = z
  .object({
    currentPassword: z.string().min(1, "Current password is required."),
    newPassword: z
      .string()
      .min(8, "New password must be at least 8 characters."),
    confirmNewPassword: z.string(),
  })
  .refine((data) => data.newPassword === data.confirmNewPassword, {
    message: "New passwords do not match.",
    path: ["confirmNewPassword"],
  })

export function ProfileSettings() {
  const { user: { data: user } = {} } = useSession()
  const utils = trpc.useUtils()

  const profileForm = useForm<z.infer<typeof profileSettingsSchema>>({
    resolver: zodResolver(profileSettingsSchema),
    defaultValues: {
      name: "",
      email: "",
    },
  })

  const passwordForm = useForm<z.infer<typeof changePasswordSchema>>({
    resolver: zodResolver(changePasswordSchema),
    defaultValues: {
      currentPassword: "",
      newPassword: "",
      confirmNewPassword: "",
    },
  })

  const { isDirty } = profileForm.formState

  useEffect(() => {
    if (user) {
      profileForm.reset({
        name: user.name ?? "",
        email: user.email ?? "",
      })
    }
  }, [user, profileForm])

  const updateProfileMutation = trpc.user.updateProfile.useMutation({
    onSuccess: async (data) => {
      if (data?.user) {
        profileForm.reset({
          name: data.user.name ?? "",
          email: data.user.email ?? "",
        })
        toast.success("Profile updated successfully.")
      }
      utils.user.me.invalidate()
    },
    onError: (error) => {
      toast.error(error.message || "Failed to update profile.")
    },
  })

  const changePasswordMutation = trpc.user.changePassword.useMutation({
    onSuccess: (data) => {
      Cookies.set("token", data.token)
      toast.success("Password changed successfully.")
      passwordForm.reset()
      utils.user.me.invalidate()
    },
    onError: (error) => {
      toast.error(error.message || "Failed to change password.")
    },
  })

  const onProfileSubmit = (values: z.infer<typeof profileSettingsSchema>) => {
    updateProfileMutation.mutate(values)
  }

  const onChangePasswordSubmit = (
    values: z.infer<typeof changePasswordSchema>
  ) => {
    changePasswordMutation.mutate({
      currentPassword: values.currentPassword,
      newPassword: values.newPassword,
    })
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
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
          <Form {...profileForm}>
            <form
              id="profile-settings-form"
              onSubmit={profileForm.handleSubmit(onProfileSubmit)}
              className="space-y-6"
            >
              <FormField
                control={profileForm.control}
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
                control={profileForm.control}
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

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Change Password</CardTitle>
            <div className="flex items-center gap-4">
              {passwordForm.formState.isDirty && (
                <p className="text-sm text-muted-foreground">Unsaved changes</p>
              )}
              <Button
                type="submit"
                form="change-password-form"
                disabled={
                  changePasswordMutation.isPending ||
                  !passwordForm.formState.isDirty
                }
                loading={changePasswordMutation.isPending}
              >
                <KeyRound className="mr-2 h-4 w-4" />
                Update Password
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <Form {...passwordForm}>
            <form
              id="change-password-form"
              onSubmit={passwordForm.handleSubmit(onChangePasswordSubmit)}
              className="space-y-6"
            >
              <FormField
                control={passwordForm.control}
                name="currentPassword"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Current Password</FormLabel>
                    <FormControl>
                      <Input type="password" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={passwordForm.control}
                name="newPassword"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>New Password</FormLabel>
                    <FormControl>
                      <Input type="password" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={passwordForm.control}
                name="confirmNewPassword"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Confirm New Password</FormLabel>
                    <FormControl>
                      <Input type="password" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  )
}
