import { useEffect } from "react"
import {
  CardDescription,
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
  Textarea,
  cn,
} from "@repo/ui"
import { Card, CardContent, CardHeader, CardTitle } from "@repo/ui"
import { Eye, LayoutTemplate, Mail, Pencil, Users } from "lucide-react"
import { useSession } from "@/hooks"
import { trpc } from "@/trpc"
import { useCampaignContext } from "../useCampaignContext"

export const SettingsTab = () => {
  const { orgId } = useSession()

  const { form, isEditable, campaignQuery } = useCampaignContext()

  const { data: templates } = trpc.template.list.useQuery(
    {
      organizationId: orgId ?? "",
      page: 1,
      perPage: 100,
    },
    {
      enabled: !!orgId,
      staleTime: Number.POSITIVE_INFINITY,
    }
  )

  const { data: lists } = trpc.list.list.useQuery(
    {
      organizationId: orgId ?? "",
      page: 1,
      perPage: 100,
    },
    {
      enabled: !!orgId,
      staleTime: Number.POSITIVE_INFINITY,
    }
  )

  useEffect(() => {
    form.reset({
      title: campaignQuery.data?.campaign?.title || "",
      description: campaignQuery.data?.campaign?.description || "",
      subject: campaignQuery.data?.campaign?.subject || "",
      templateId: campaignQuery.data?.campaign?.templateId || "",
      openTracking: campaignQuery.data?.campaign?.openTracking || false,
      listIds:
        campaignQuery.data?.campaign?.CampaignLists?.map(
          (list) => list.listId
        ) || [],
      content: campaignQuery.data?.campaign?.content || "",
    })
  }, [templates, campaignQuery.data, form])

  return (
    <div className="flex flex-col gap-3">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {/* Campaign Details */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Pencil className="h-5 w-5 text-primary" />
              Campaign Details
            </CardTitle>
            <CardDescription>
              Basic information about your campaign
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <FormField
              control={form.control}
              name="title"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Campaign Title</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="Monthly Newsletter"
                      {...field}
                      disabled={!isEditable}
                    />
                  </FormControl>
                  <FormDescription>
                    Internal name for your campaign
                  </FormDescription>
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
                      placeholder="Campaign details and notes..."
                      className="resize-none"
                      {...field}
                      disabled={!isEditable}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </CardContent>
        </Card>

        {/* Email Content */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Mail className="h-5 w-5 text-primary" />
              Email Content
            </CardTitle>
            <CardDescription>
              Configure your email content and template
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <FormField
              control={form.control}
              name="subject"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Email Subject</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="Your Monthly Newsletter is Here!"
                      {...field}
                      disabled={!isEditable}
                    />
                  </FormControl>
                  <FormDescription>
                    The subject line recipients will see
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="templateId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Template</FormLabel>
                  <Select
                    onValueChange={(value) =>
                      field.onChange(value === "none" ? "" : value)
                    }
                    value={field.value || "none"}
                    disabled={!isEditable}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select a template" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="none">
                        <div className="flex items-center gap-2">
                          No Template
                        </div>
                      </SelectItem>
                      {templates?.templates.map((template) => (
                        <SelectItem key={template.id} value={template.id}>
                          <div className="flex items-center gap-2">
                            <LayoutTemplate className="h-4 w-4" />
                            {template.name}
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="openTracking"
              render={({ field }) => (
                <FormItem className="flex items-center justify-between rounded-lg border p-4">
                  <div className="space-y-0.5">
                    <FormLabel className="text-base">
                      <div className="flex items-center gap-2">
                        <Eye className="w-4 h-4" />
                        Open Tracking
                      </div>
                    </FormLabel>
                    <FormDescription>
                      Track when recipients open your emails
                    </FormDescription>
                  </div>
                  <FormControl>
                    <Switch
                      checked={field.value}
                      onCheckedChange={field.onChange}
                      disabled={!isEditable}
                    />
                  </FormControl>
                </FormItem>
              )}
            />
          </CardContent>
        </Card>
      </div>

      {/* Recipients */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5 text-primary" />
            Recipients
          </CardTitle>
          <CardDescription>
            Choose which subscriber lists will receive this campaign
          </CardDescription>
        </CardHeader>
        <CardContent>
          <FormField
            control={form.control}
            name="listIds"
            render={({ field }) => (
              <FormItem>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 cursor-pointer">
                  {lists?.lists.map((list) => (
                    <div
                      key={list.id}
                      className={cn(
                        "relative flex items-center rounded-lg border-2 p-4 transition-colors",
                        field.value.includes(list.id)
                          ? "border-primary bg-primary/5"
                          : "border-border hover:border-primary/50",
                        !isEditable && "pointer-events-none opacity-60"
                      )}
                      onClick={() => {
                        if (!isEditable) return
                        const newValue = field.value.includes(list.id)
                          ? field.value.filter((id) => id !== list.id)
                          : [...field.value, list.id]
                        field.onChange(newValue)
                      }}
                    >
                      <div className="flex-1">
                        <h4 className="font-medium">{list.name}</h4>
                        <p className="text-sm text-muted-foreground">
                          {list._count.ListSubscribers.toLocaleString()}{" "}
                          subscribers
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
                <FormMessage />
              </FormItem>
            )}
          />
        </CardContent>
      </Card>
    </div>
  )
}
