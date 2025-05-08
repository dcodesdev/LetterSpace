import { ArrowLeft } from "lucide-react"
import { useNavigate } from "react-router"
import {
  Button,
  Form,
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@repo/ui"
import { useEffect } from "react"
import { EditorTab } from "./tabs/editor-tab/editor-tab"
import { useCampaignContext } from "./useCampaignContext"
import { NotFound } from "./not-found"
import { Loading } from "./loading"
import { Stats } from "./stats"
import { SettingsTab } from "./tabs/settings-tab"
import { EditorActions } from "./editor-actions"
import { CampaignActions } from "./campaign-actions"

export function EditCampaignPage() {
  const navigate = useNavigate()

  const {
    campaignQuery: { data: campaign, isLoading: isCampaignLoading },
    updateCampaign,
    form,
    isEditable,
  } = useCampaignContext()

  useEffect(() => {
    if (campaign?.campaign) {
      form.reset({
        title: campaign.campaign.title,
        description: campaign.campaign.description ?? "",
        subject: campaign.campaign.subject ?? "",
        templateId: campaign.campaign.templateId ?? "",
        listIds: campaign.campaign.CampaignLists?.map((cl) => cl.List.id) ?? [],
        openTracking: campaign.campaign.openTracking ?? true,
        content: campaign.campaign.content ?? "",
      })
    }
  }, [campaign]) // eslint-disable-line react-hooks/exhaustive-deps

  if (isCampaignLoading) {
    return <Loading />
  }

  if (!campaign) {
    return <NotFound />
  }

  return (
    <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            onClick={() => navigate(-1)}
            size="icon"
            className="rounded-full"
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-3xl font-bold">
              {isEditable ? "Edit Campaign" : campaign.campaign?.title}
            </h1>
            <p className="text-muted-foreground">
              {isEditable
                ? "Configure your campaign settings"
                : `Campaign sent on ${new Date(
                    campaign.campaign?.createdAt ?? ""
                  ).toLocaleDateString()}`}
            </p>
          </div>
        </div>
        <CampaignActions />
      </div>

      {!isEditable ? (
        <Stats />
      ) : (
        <Form {...form}>
          <form
            onSubmit={form.handleSubmit(() => updateCampaign())}
            className="space-y-4"
          >
            <Tabs defaultValue="settings">
              <div className="flex items-center justify-between">
                <TabsList>
                  <TabsTrigger value="settings">Settings</TabsTrigger>
                  <TabsTrigger value="editor">Content Editor</TabsTrigger>
                </TabsList>
                {isEditable && <EditorActions />}
              </div>

              <TabsContent value="settings">
                <SettingsTab />
              </TabsContent>

              <TabsContent value="editor">
                <EditorTab />
              </TabsContent>
            </Tabs>
          </form>
        </Form>
      )}
    </div>
  )
}
