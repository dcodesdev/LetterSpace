import { ArrowUp, Mail, Plus, ArrowDown, Eye, Send } from "lucide-react"
import {
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Input,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  Form,
  FormField,
  FormItem,
  FormLabel,
  FormControl,
  FormDescription,
  Textarea,
  FormMessage,
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  cn,
  DataTable,
} from "@repo/ui"
import { useCallback, useEffect, useMemo, useState } from "react"
import { useNavigate } from "react-router"
import { usePaginationWithQueryState, useSession } from "@/hooks"
import { trpc } from "@/trpc"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { toast } from "sonner"
import z from "zod"
import { CardSkeleton, Pagination } from "@/components"
import { columns as getColumns } from "./columns"
import { CampaignSearch } from "./campaign-search"

const createCampaignSchema = z.object({
  title: z.string().min(1, "Campaign title is required"),
  description: z.string().optional(),
})

export function CampaignsPage() {
  const [campaignToDelete, setCampaignToDelete] = useState<string | null>(null)
  const navigate = useNavigate()
  const { organization } = useSession()
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false)

  const { pagination, setPagination } = usePaginationWithQueryState()

  const form = useForm<z.infer<typeof createCampaignSchema>>({
    resolver: zodResolver(createCampaignSchema),
    defaultValues: {
      title: "",
      description: "",
    },
  })

  const createCampaignMutation = trpc.campaign.create.useMutation({
    onSuccess: (data) => {
      setIsCreateDialogOpen(false)
      form.reset()
      navigate(`/dashboard/campaigns/${data.campaign.id}`)
    },
    onError: (error) => {
      toast.error(error.message)
    },
  })

  const utils = trpc.useUtils()

  const deleteCampaignMutation = trpc.campaign.delete.useMutation({
    onSuccess: () => {
      toast.success("Campaign deleted!")
      setCampaignToDelete(null)
      utils.campaign.list.invalidate()
    },
    onError: (error) => {
      toast.error(error.message)
    },
  })

  const duplicateCampaignMutation = trpc.campaign.duplicate.useMutation({
    onSuccess: (data) => {
      toast.success("Campaign duplicated!")
      utils.campaign.list.invalidate()
      navigate(`/dashboard/campaigns/${data.campaign.id}`)
    },
    onError: (error) => {
      toast.error(error.message)
    },
  })

  const onSubmit = (values: z.infer<typeof createCampaignSchema>) => {
    if (!organization?.id) return
    createCampaignMutation.mutate({
      ...values,
      organizationId: organization.id,
    })
  }

  const { data, isLoading } = trpc.campaign.list.useQuery(
    {
      organizationId: organization?.id ?? "",
      page: pagination.page,
      perPage: pagination.perPage,
      search: pagination.searchQuery,
    },
    {
      enabled: !!organization?.id,
    }
  )

  useEffect(() => {
    setPagination("totalPages", data?.pagination.totalPages)
  }, [data]) // eslint-disable-line react-hooks/exhaustive-deps

  const campaigns = data?.campaigns ?? []

  const { data: analytics, isLoading: analyticsLoading } =
    trpc.stats.getStats.useQuery(
      {
        organizationId: organization?.id ?? "",
      },
      {
        enabled: !!organization?.id,
      }
    )

  const handleDeleteCampaign = (id: string) => {
    if (!organization?.id) return

    deleteCampaignMutation.mutate({
      id,
      organizationId: organization.id,
    })
  }

  const handleDuplicateCampaign = useCallback(
    (id: string) => {
      if (!organization?.id) return

      duplicateCampaignMutation.mutate({
        id,
        organizationId: organization.id,
      })
    },
    [organization, duplicateCampaignMutation]
  )

  const columns = useMemo(
    () =>
      getColumns({
        onDelete: setCampaignToDelete,
        onDuplicate: handleDuplicateCampaign,
      }),
    [handleDuplicateCampaign, setCampaignToDelete]
  )

  return (
    <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
      <div className="flex items-center justify-between space-y-2">
        <h2 className="text-3xl font-bold tracking-tight">Campaigns</h2>
      </div>

      {/* Stats Overview */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card hoverEffect>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Total Campaigns
            </CardTitle>
            <Mail className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {analyticsLoading || !analytics ? (
              <CardSkeleton />
            ) : (
              <>
                <div className="text-2xl font-bold">
                  {analytics.campaigns.total.toLocaleString()}
                </div>
                <p className="text-xs text-muted-foreground inline-flex items-center gap-1">
                  <span
                    className={cn(
                      "inline-flex items-center",
                      analytics.campaigns.comparison >= 0
                        ? "text-emerald-500"
                        : "text-rose-500"
                    )}
                  >
                    {analytics.campaigns.comparison >= 0 ? (
                      <ArrowUp className="mr-1 h-4 w-4" />
                    ) : (
                      <ArrowDown className="mr-1 h-4 w-4" />
                    )}
                    {analytics.campaigns.comparison >= 0 ? "+" : "-"}
                    {Math.abs(analytics.campaigns.comparison)} vs last month
                  </span>
                </p>
              </>
            )}
          </CardContent>
        </Card>

        <Card hoverEffect>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Average Open Rate{" "}
              <small className="text-xs text-muted-foreground">
                (Last 30 days)
              </small>
            </CardTitle>
            <Eye className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {analyticsLoading || !analytics ? (
              <CardSkeleton />
            ) : (
              <>
                <div className="text-2xl font-bold">
                  {analytics.openRate.thisMonth.toFixed(1)}%
                </div>
                <p className="text-xs text-muted-foreground inline-flex items-center gap-1">
                  <span
                    className={cn(
                      "inline-flex items-center",
                      analytics.openRate.comparison >= 0
                        ? "text-emerald-500"
                        : "text-rose-500"
                    )}
                  >
                    {analytics.openRate.comparison >= 0 ? (
                      <ArrowUp className="mr-1 h-4 w-4" />
                    ) : (
                      <ArrowDown className="mr-1 h-4 w-4" />
                    )}
                    {analytics.openRate.comparison >= 0 ? "+" : "-"}
                    {Math.abs(analytics.openRate.comparison).toFixed(1)}%
                  </span>
                  vs last month
                </p>
              </>
            )}
          </CardContent>
        </Card>

        <Card hoverEffect>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Average Click Rate{" "}
              <small className="text-xs text-muted-foreground">
                (Last 30 days)
              </small>
            </CardTitle>
            <Send className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {analyticsLoading || !analytics ? (
              <CardSkeleton />
            ) : (
              <>
                <div className="text-2xl font-bold">
                  {analytics.clickRate.thisMonth.rate.toFixed(1)}%
                </div>
                <p className="text-xs text-muted-foreground inline-flex items-center gap-1">
                  <span
                    className={cn(
                      "inline-flex items-center",
                      analytics.clickRate.comparison >= 0
                        ? "text-emerald-500"
                        : "text-rose-500"
                    )}
                  >
                    {analytics.clickRate.comparison >= 0 ? (
                      <ArrowUp className="mr-1 h-4 w-4" />
                    ) : (
                      <ArrowDown className="mr-1 h-4 w-4" />
                    )}
                    {analytics.clickRate.comparison >= 0 ? "+" : "-"}
                    {Math.abs(analytics.clickRate.comparison).toFixed(1)}%
                  </span>
                  vs last month
                </p>
              </>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex flex-1 items-center space-x-2">
            <CampaignSearch />
          </div>

          <div className="flex items-center space-x-2">
            {/* <WithTooltip content="Download campaigns">
              <Button variant="outline" size="icon">
                <Download className="h-4 w-4" />
              </Button>
            </WithTooltip> */}

            <div className="flex items-center space-x-2">
              <Dialog
                open={isCreateDialogOpen}
                onOpenChange={setIsCreateDialogOpen}
              >
                <DialogTrigger asChild>
                  <Button>
                    <Plus className="h-4 w-4" />
                    Create Campaign
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Create New Campaign</DialogTitle>
                    <DialogDescription>
                      Start by giving your campaign a name and description. You
                      can configure the details after creation.
                    </DialogDescription>
                  </DialogHeader>
                  <Form {...form}>
                    <form
                      onSubmit={form.handleSubmit(onSubmit)}
                      className="space-y-4"
                    >
                      <FormField
                        control={form.control}
                        name="title"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Campaign Title</FormLabel>
                            <FormControl>
                              <Input
                                placeholder="Enter campaign title"
                                {...field}
                              />
                            </FormControl>
                            <FormDescription>
                              This is for your internal reference only.
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
                            <FormLabel>Description (Optional)</FormLabel>
                            <FormControl>
                              <Textarea
                                placeholder="Enter campaign description"
                                className="resize-none"
                                {...field}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <Button
                        type="submit"
                        className="w-full"
                        disabled={createCampaignMutation.isPending}
                      >
                        {createCampaignMutation.isPending
                          ? "Creating..."
                          : "Create Campaign"}
                      </Button>
                    </form>
                  </Form>
                </DialogContent>
              </Dialog>
            </div>
          </div>
        </div>
        <DataTable
          columns={columns}
          data={campaigns}
          title="Campaigns"
          className="h-[calc(100vh-440px)]"
          isLoading={isLoading}
          NoResultsContent={
            <div className="flex flex-col items-center justify-center h-full my-10 gap-3">
              <p className="text-sm text-muted-foreground">
                No campaigns found.
              </p>
              <p className="text-xs text-muted-foreground">
                Create a new campaign to get started.
              </p>
              <Button onClick={() => setIsCreateDialogOpen(true)}>
                Create a Campaign <Plus className="ml-2 h-4 w-4" />
              </Button>
            </div>
          }
        />
        <div className="flex items-center justify-between">
          <div className="flex-1 text-sm text-muted-foreground">
            {data?.pagination.total ?? 0} total campaigns
          </div>
          <Pagination
            page={pagination.page}
            totalPages={pagination.totalPages}
            onPageChange={(page) => setPagination("page", page)}
            hasNextPage={pagination.page < pagination.totalPages}
          />
        </div>
      </div>

      <AlertDialog
        open={!!campaignToDelete}
        onOpenChange={(open) => !open && setCampaignToDelete(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete the
              campaign from our servers.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() =>
                campaignToDelete && handleDeleteCampaign(campaignToDelete)
              }
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
