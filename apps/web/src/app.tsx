import { BrowserRouter, Route, Routes } from "react-router"
import { scan } from "react-scan"
import {
  AnalyticsPage,
  AuthPage,
  CampaignsPage,
  DashboardLayout,
  DashboardPage,
  EditCampaignLayout,
  EditCampaignPage,
  ListsPage,
  MessagesPage,
  NotFoundPage,
  OnboardingPage,
  SettingsPage,
  SubscribersPage,
  TemplatesPage,
  UnsubscribePage,
  VerifyEmailPage,
} from "./pages"
import { WebhookDetails } from "./pages/dashboard/settings/webhook-details"

if (import.meta.env.DEV) {
  scan({
    enabled: true,
    log: true,
  })
}

export function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<AuthPage />} />
        <Route path="dashboard" element={<DashboardLayout />}>
          <Route index element={<DashboardPage />} />
          <Route path="subscribers" element={<SubscribersPage />} />
          <Route path="campaigns">
            <Route index element={<CampaignsPage />} />
            <Route
              path=":id"
              element={
                <EditCampaignLayout>
                  <EditCampaignPage />
                </EditCampaignLayout>
              }
            />
          </Route>
          <Route path="templates" element={<TemplatesPage />} />
          <Route path="settings">
            <Route index element={<SettingsPage />} />
            <Route path="webhooks/:id" element={<WebhookDetails />} />
          </Route>
          <Route path="analytics" element={<AnalyticsPage />} />
          <Route path="lists" element={<ListsPage />} />
          <Route path="messages" element={<MessagesPage />} />
        </Route>
        <Route path="/onboarding" element={<OnboardingPage />} />
        <Route path="/unsubscribe" element={<UnsubscribePage />} />
        <Route path="/verify-email" element={<VerifyEmailPage />} />
        <Route path="*" element={<NotFoundPage />} />
      </Routes>
    </BrowserRouter>
  )
}
