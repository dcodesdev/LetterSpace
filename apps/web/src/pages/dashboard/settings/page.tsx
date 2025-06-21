import { TabsContent, TabsTrigger, TabsList, Tabs } from "@repo/ui"
import { useNavigate, useSearchParams } from "react-router"
import { SmtpSettings } from "./smtp-settings"
import { GeneralSettings } from "./general-settings"
import { ApiKeys } from "./api-keys"
import { EmailSettings } from "./email-delivery-settings"
import { OrganizationSettings } from "./organization-settings"
import { WebhookSettings } from "./webhook-settings"
import { trpc } from "@/trpc"
import { useSession } from "@/hooks"
import { Loader } from "@/components"
import { ProfileSettings } from "./profile-settings"

export function SettingsPage() {
  const { organization } = useSession()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const defaultTab = searchParams.get("tab") || "profile"

  const { isLoading } = trpc.settings.getSmtp.useQuery(
    {
      organizationId: organization?.id ?? "",
    },
    {
      enabled: !!organization?.id,
      staleTime: 1000 * 60 * 5,
    }
  )

  if (isLoading) {
    return (
      <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
        <div className="flex items-center justify-between space-y-2">
          <h2 className="text-3xl font-bold tracking-tight">Settings</h2>
        </div>
        <Loader text="Loading settings..." />
      </div>
    )
  }

  return (
    <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
      <div className="flex items-center justify-between space-y-2">
        <h2 className="text-3xl font-bold tracking-tight">Settings</h2>
      </div>

      <Tabs
        defaultValue={defaultTab}
        onValueChange={(value) => {
          navigate(`/dashboard/settings?tab=${value}`)
        }}
        className="space-y-4"
      >
        <TabsList>
          <TabsTrigger value="profile">Profile</TabsTrigger>
          <TabsTrigger value="general">General</TabsTrigger>
          <TabsTrigger value="organization">Organization</TabsTrigger>
          <TabsTrigger value="smtp">SMTP</TabsTrigger>
          <TabsTrigger value="email">Email Delivery</TabsTrigger>
          <TabsTrigger value="api">API Keys</TabsTrigger>
          <TabsTrigger value="webhooks">Webhooks</TabsTrigger>
        </TabsList>
        <TabsContent value="profile">
          <ProfileSettings />
        </TabsContent>
        <TabsContent value="general">
          <div className="max-w-4xl">
            <GeneralSettings />
          </div>
        </TabsContent>
        <TabsContent value="organization">
          <OrganizationSettings />
        </TabsContent>
        <TabsContent value="smtp" className="space-y-4">
          <div className="max-w-4xl">
            <SmtpSettings />
          </div>
        </TabsContent>
        <TabsContent value="email" className="space-y-4">
          <div className="max-w-4xl">
            <EmailSettings />
          </div>
        </TabsContent>
        <TabsContent value="api">
          <ApiKeys />
        </TabsContent>
        <TabsContent value="webhooks">
          <WebhookSettings />
        </TabsContent>
      </Tabs>
    </div>
  )
}
