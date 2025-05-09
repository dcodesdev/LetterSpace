import {
  Badge,
  Progress,
  DataTable,
  Card,
  CardContent,
  CardTitle,
  CardHeader,
} from "@repo/ui"
import { Mail } from "lucide-react"
import { Link, useParams } from "react-router"
import { trpc } from "@/trpc"
import { useSession, usePaginationWithQueryState } from "@/hooks"
import { useState, useEffect } from "react"
import { columns } from "../../messages/columns"
import { Pagination } from "@/components"

export const Stats = () => {
  const { id } = useParams()
  const { orgId } = useSession()
  const [openPreviews, setOpenPreviews] = useState<Record<string, boolean>>({})
  const [openErrors, setOpenErrors] = useState<Record<string, boolean>>({})
  const { pagination, setPagination } = usePaginationWithQueryState({
    perPage: 100,
  })

  const { data: campaign } = trpc.campaign.get.useQuery(
    {
      id: id ?? "",
      organizationId: orgId ?? "",
    },
    {
      enabled: !!id && !!orgId,
    }
  )

  const { data: messages, isLoading } = trpc.message.list.useQuery(
    {
      organizationId: orgId ?? "",
      campaignId: id ?? "",
      page: pagination.page,
      perPage: pagination.perPage,
    },
    {
      enabled: !!id && !!orgId,
    }
  )

  useEffect(() => {
    setPagination("totalPages", messages?.pagination.totalPages)
  }, [messages, setPagination])

  const handleOpenPreview = (messageId: string) => {
    setOpenPreviews((prev) => ({ ...prev, [messageId]: true }))
  }

  const handleClosePreview = (messageId: string) => {
    setOpenPreviews((prev) => ({ ...prev, [messageId]: false }))
  }

  const handleOpenError = (messageId: string) => {
    setOpenErrors((prev) => ({ ...prev, [messageId]: true }))
  }

  const handleCloseError = (messageId: string) => {
    setOpenErrors((prev) => ({ ...prev, [messageId]: false }))
  }

  if (!campaign) {
    return null
  }

  return (
    <div className="flex flex-col space-y-6">
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Progress</CardTitle>
            <Mail className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {campaign.stats.processed.toLocaleString()} Processed
            </div>
            <p className="text-xs text-muted-foreground">
              {campaign.stats.queuedMessages.toLocaleString()} Remaining
            </p>
            <br />

            <Progress
              value={
                (campaign.stats.processed / campaign.stats.totalMessages) * 100
              }
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Delivery Status
            </CardTitle>
            <Mail className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="text-2xl font-bold">
                {(campaign.stats.totalMessages > 0
                  ? (campaign.stats.sentMessages /
                      campaign.stats.totalMessages) *
                    100
                  : 0
                ).toFixed(1)}
                %
              </div>
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>
                  <span className="font-bold text-primary">
                    {campaign.stats.sentMessages.toLocaleString()}
                  </span>{" "}
                  out of {campaign.stats.totalMessages.toLocaleString()}
                </span>
                <span className="text-destructive">
                  {campaign.stats.failedMessages.toLocaleString()} failed
                </span>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Click Rate</CardTitle>
            <Mail className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {campaign.stats.clickRate.toFixed(1)}%
            </div>
            <p className="text-xs text-muted-foreground">
              <span className="font-bold text-primary">
                {campaign.stats.clicked.toLocaleString()}
              </span>{" "}
              total clicks out of {campaign.stats.sentMessages.toLocaleString()}{" "}
              messages
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Open Rate</CardTitle>
            <Mail className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {campaign.stats.openRate.toFixed(1)}%
            </div>
            <p className="text-xs text-muted-foreground">
              <span className="font-bold text-primary">
                {campaign.stats.opened.toLocaleString()}
              </span>{" "}
              out of {campaign.stats.sentMessages.toLocaleString()} messages
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Unsubscribes</CardTitle>
            <Mail className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {campaign.campaign.unsubscribedCount?.toLocaleString() ?? 0}
            </div>
            <p className="text-xs text-muted-foreground">
              Total unsubscribes for this campaign
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Campaign Details Card */}
      <Card>
        <CardHeader>
          <CardTitle>Campaign Details</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <h4 className="font-medium mb-2">Email Subject</h4>
              <p className="text-muted-foreground">
                {campaign.campaign?.subject}
              </p>
            </div>
            <div>
              <h4 className="font-medium mb-2">Recipient Lists</h4>
              <div className="flex flex-wrap gap-2">
                {campaign.campaign?.CampaignLists?.map((cl) => (
                  <Link key={cl.List.id} to="/dashboard/lists">
                    <Badge variant="secondary">{cl.List.name}</Badge>
                  </Link>
                ))}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <DataTable
        title="Messages"
        columns={columns({
          onOpenPreview: handleOpenPreview,
          onOpenError: handleOpenError,
          onClosePreview: handleClosePreview,
          onCloseError: handleCloseError,
          openPreviews,
          openErrors,
        })}
        data={messages?.messages ?? []}
        className="h-[500px]"
        isLoading={isLoading}
      />
      <div className="flex items-center justify-between mt-4">
        <div className="text-sm text-muted-foreground">
          {messages?.pagination.total ?? 0} total messages
        </div>
        <Pagination
          page={pagination.page}
          totalPages={pagination.totalPages}
          onPageChange={(page) => setPagination("page", page)}
          hasNextPage={pagination.page < pagination.totalPages}
        />
      </div>
    </div>
  )
}
