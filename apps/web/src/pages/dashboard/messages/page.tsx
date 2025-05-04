"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle, DataTable } from "@repo/ui"
import { Mail, Send, Users, ArrowUp } from "lucide-react"
import { useSession, usePaginationWithQueryState } from "@/hooks"
import { trpc } from "@/trpc"
import { CardSkeleton, StatCard, Pagination } from "@/components"
import { columns } from "./columns"
import { MessageSearch } from "./message-search"

export function MessagesPage() {
  const [openPreviews, setOpenPreviews] = useState<Record<string, boolean>>({})
  const [openErrors, setOpenErrors] = useState<Record<string, boolean>>({})
  const { pagination, setPagination } = usePaginationWithQueryState({
    perPage: 100,
  })

  const { organization } = useSession()

  const { data, isLoading } = trpc.message.list.useQuery(
    {
      organizationId: organization?.id ?? "",
      page: pagination.page,
      perPage: pagination.perPage,
      search: pagination.searchQuery,
    },
    {
      enabled: !!organization?.id,
      refetchInterval: 5000,
    }
  )

  useEffect(() => {
    setPagination("totalPages", data?.pagination.totalPages)
  }, [data]) // eslint-disable-line react-hooks/exhaustive-deps

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

  const { data: analytics, isLoading: analyticsLoading } =
    trpc.stats.getStats.useQuery(
      {
        organizationId: organization?.id ?? "",
      },
      {
        enabled: !!organization?.id,
      }
    )

  return (
    <>
      <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
        <div className="flex items-center justify-between space-y-2">
          <h2 className="text-3xl font-bold tracking-tight">Messages</h2>
        </div>

        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          <Card hoverEffect>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Total Messages
              </CardTitle>
              <Mail className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              {analyticsLoading || !analytics ? (
                <CardSkeleton />
              ) : (
                <>
                  <div className="text-2xl font-bold">
                    {analytics.messages.total.toLocaleString()}
                  </div>

                  <div className="text-xs text-muted-foreground inline-flex items-center gap-1">
                    <span className="text-emerald-500 inline-flex items-center">
                      <ArrowUp className="mr-1 h-4 w-4" />
                      {analytics.messages.Last30Days >= 0 ? "+" : "-"}
                      {Math.abs(
                        analytics.messages.Last30Days
                      ).toLocaleString()}{" "}
                      This month
                    </span>
                  </div>
                </>
              )}
            </CardContent>
          </Card>
          <Card hoverEffect>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Recipients</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              {analyticsLoading || !analytics ? (
                <CardSkeleton />
              ) : (
                <>
                  <div className="text-2xl font-bold">
                    {Number(analytics?.recipients.allTime).toLocaleString()}
                  </div>
                  <div className="text-xs text-muted-foreground inline-flex items-center gap-1">
                    <span className="text-emerald-500 inline-flex items-center">
                      <ArrowUp className="mr-1 h-4 w-4" />
                      {Number(analytics.recipients.comparison) >= 0 ? "+" : "-"}
                      {Math.abs(Number(analytics.recipients.comparison))} vs
                      last period
                    </span>
                  </div>
                </>
              )}
            </CardContent>
          </Card>
          <StatCard
            isLoading={analyticsLoading}
            smallTitle="Last 30 days"
            title="Delivery Rate"
            value={`${analytics?.deliveryRate.thisMonth.rate.toFixed(1)}%`}
            icon={Send}
            change={analytics?.deliveryRate.comparison}
            subtitle={`${analytics?.deliveryRate.thisMonth.delivered.toLocaleString()} out of ${analytics?.messages.Last30Days.toLocaleString()} total messages`}
          />
        </div>

        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <MessageSearch />
            {/* <Button variant="outline" size="icon" className="ml-auto">
              <Download className="h-4 w-4" />
            </Button> */}
          </div>

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
            data={data?.messages ?? []}
            className="h-[calc(100vh-452px)]"
            isLoading={isLoading}
            NoResultsContent={
              <div className="flex flex-col items-center justify-center h-full my-10 gap-3">
                <p className="text-sm text-muted-foreground">
                  No messages found.
                </p>
              </div>
            }
          />

          <div className="flex items-center justify-between">
            <div className="text-sm text-muted-foreground">
              {data?.pagination.total ?? 0} total messages
            </div>
            <Pagination
              page={pagination.page}
              totalPages={pagination.totalPages}
              onPageChange={(page) => setPagination("page", page)}
              hasNextPage={pagination.page < pagination.totalPages}
            />
          </div>
        </div>
      </div>
    </>
  )
}
