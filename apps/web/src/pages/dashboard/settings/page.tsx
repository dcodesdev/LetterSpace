"use client"

import { TabsContent, TabsTrigger, TabsList, Tabs } from "@repo/ui"
import { SmtpSettings } from "./smtp-settings"
import { GeneralSettings } from "./general-settings"
import { ApiKeys } from "./api-keys"
import { EmailSettings } from "./email-delivery-settings"

export function SettingsPage() {
  return (
    <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
      <div className="flex items-center justify-between space-y-2">
        <h2 className="text-3xl font-bold tracking-tight">Settings</h2>
      </div>

      <Tabs defaultValue="smtp" className="space-y-4">
        <TabsList>
          <TabsTrigger value="smtp">SMTP</TabsTrigger>
          <TabsTrigger value="email">Email Delivery</TabsTrigger>
          <TabsTrigger value="general">General</TabsTrigger>
          <TabsTrigger value="api">API Keys</TabsTrigger>
          {/* <TabsTrigger value="webhooks">Webhooks</TabsTrigger> */}
        </TabsList>
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
        <TabsContent value="general">
          <div className="max-w-4xl">
            <GeneralSettings />
          </div>
        </TabsContent>
        <TabsContent value="api">
          <ApiKeys />
        </TabsContent>
        {/* <TabsContent value="webhooks">
            <WebhookSettings />
          </TabsContent> */}
      </Tabs>
    </div>
  )
}
