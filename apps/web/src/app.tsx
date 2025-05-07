import { Route, Routes, BrowserRouter } from "react-router"
import {
  DashboardPage,
  DashboardLayout,
  SubscribersPage,
  CampaignsPage,
  EditCampaignPage,
  TemplatesPage,
  SettingsPage,
  AnalyticsPage,
  ListsPage,
  OnboardingPage,
  MessagesPage,
  EditCampaignLayout,
  UnsubscribePage,
  AuthPage,
  NotFoundPage,
  VerifyEmailPage,
} from "./pages"
import { scan } from "react-scan"

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
          <Route path="settings" element={<SettingsPage />} />
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
