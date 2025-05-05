"use client"

import {
  Mail,
  ArrowRight,
  ArrowUp,
  ArrowDown,
  Database,
  Users,
  Clock,
  Loader2,
  CheckCircle,
  XCircle,
  Eye,
  MousePointer,
  RefreshCw,
} from "lucide-react"
import { Line, LineChart, ResponsiveContainer, Tooltip, XAxis } from "recharts"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Button,
  cn,
} from "@repo/ui"
import { trpc } from "@/trpc"
import { useSession } from "@/hooks"
import { Link } from "react-router"
import { CardSkeleton, WithTooltip } from "@/components"
import dayjs from "dayjs"
import { IconExclamationCircle } from "@tabler/icons-react"

const statusConfig = {
  QUEUED: {
    icon: Clock,
    textClassName: "text-primary",
  },
  PENDING: {
    icon: Loader2,
    textClassName: "text-foreground",
  },
  SENT: {
    icon: CheckCircle,
    textClassName: "text-emerald-500",
  },
  FAILED: {
    icon: XCircle,
    textClassName: "text-destructive",
  },
  OPENED: {
    icon: Eye,
    textClassName: "text-blue-800",
  },
  CLICKED: {
    icon: MousePointer,
    textClassName: "text-indigo-800",
  },
  RETRYING: {
    icon: RefreshCw,
    textClassName: "text-yellow-500",
  },
}

export function DashboardPage() {
  const { organization } = useSession()

  const { data: analytics, isLoading: analyticsLoading } =
    trpc.stats.getStats.useQuery(
      {
        organizationId: organization?.id ?? "",
      },
      {
        enabled: !!organization?.id,
      }
    )

  const { data: dashboard } = trpc.dashboard.getStats.useQuery(
    {
      organizationId: organization?.id ?? "",
    },
    {
      enabled: !!organization?.id,
    }
  )

  if (!dashboard) {
    return <div>Loading...</div>
  }

  return (
    <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
      <div className="flex items-center justify-between space-y-2">
        <h2 className="text-3xl font-bold tracking-tight">Dashboard</h2>
      </div>

      {/* Stats Overview */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card hoverEffect>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Total Subscribers
            </CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {analyticsLoading || !analytics ? (
              <CardSkeleton />
            ) : (
              <>
                <div className="text-2xl font-bold">
                  {analytics.subscribers.allTime.toLocaleString()}
                </div>
                <div
                  className={`flex items-center text-sm ${
                    analytics.subscribers.newThisMonth >= 0
                      ? "text-emerald-600"
                      : "text-red-600"
                  }`}
                >
                  {analytics.subscribers.newThisMonth >= 0 ? (
                    <ArrowUp className="mr-1 h-4 w-4" />
                  ) : (
                    <ArrowDown className="mr-1 h-4 w-4" />
                  )}
                  +{analytics.subscribers.newThisMonth} from last month
                </div>
              </>
            )}
          </CardContent>
        </Card>

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

        {/* <StatCard
          isLoading={analyticsLoading}
          smallTitle="Last 30 days"
          title="Delivery Rate"
          value={`${analytics?.deliveryRate.thisMonth.rate.toFixed(1)}%`}
          icon={Send}
          change={analytics?.deliveryRate.comparison}
          subtitle={`${analytics?.deliveryRate.thisMonth.delivered.toLocaleString()} out of ${analytics?.messages.Last30Days.toLocaleString()} total messages`}
        /> */}

        {/* 
        <StatCard
          isLoading={analyticsLoading}
          smallTitle="Last 30 days"
          title="Click Rate"
          value={`${analytics?.clickRate.thisMonth.rate.toFixed(1)}%`}
          icon={Eye}
          change={analytics?.clickRate.comparison}
        /> */}

        <Card hoverEffect>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Completed Campaigns{" "}
            </CardTitle>
            <Mail className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {analyticsLoading || !analytics ? (
              <CardSkeleton />
            ) : (
              <>
                <div className="text-2xl font-bold">
                  {analytics.completedCampaigns.total}
                </div>
                <div
                  className={`flex items-center text-sm ${
                    analytics.completedCampaigns.comparison >= 0
                      ? "text-emerald-600"
                      : "text-red-600"
                  }`}
                >
                  {analytics.completedCampaigns.comparison >= 0 ? (
                    <ArrowUp className="mr-1 h-4 w-4" />
                  ) : (
                    <ArrowDown className="mr-1 h-4 w-4" />
                  )}
                  +{analytics.completedCampaigns.comparison} from last month
                </div>
              </>
            )}
          </CardContent>
        </Card>

        <Card hoverEffect>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-1">
              Storage Used
              <WithTooltip content="Estimated storage used by this organization">
                <IconExclamationCircle className="h-4 w-4 text-muted-foreground cursor-pointer" />
              </WithTooltip>
            </CardTitle>
            <Database className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {!dashboard ? (
              <CardSkeleton />
            ) : (
              <>
                <div className="text-2xl font-bold">
                  {Number(dashboard.dbSize?.total_size_mb || "0").toFixed(2) ??
                    "0.00"}
                  MB
                </div>
                <p className="text-xs text-muted-foreground">
                  {Number(
                    dashboard.dbSize?.message_count ?? "0"
                  ).toLocaleString()}{" "}
                  messages
                </p>
              </>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
        <Card hoverEffect className="col-span-4">
          <CardHeader>
            <CardTitle>Subscriber Growth</CardTitle>
            <CardDescription>
              New subscribers over time{" "}
              <span className="text-xs text-muted-foreground">(Weekly)</span>
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={350}>
              <LineChart data={dashboard.subscriberGrowth}>
                <XAxis
                  dataKey="date"
                  stroke="#888888"
                  fontSize={12}
                  tickLine={false}
                  axisLine={false}
                  tickFormatter={(value) => {
                    return new Date(value).toLocaleDateString()
                  }}
                />
                <Tooltip
                  formatter={(value: number) => [
                    value.toLocaleString(),
                    "Subscribers",
                  ]}
                  labelFormatter={(label) =>
                    new Date(label).toLocaleDateString()
                  }
                />
                <Line
                  type="monotone"
                  dataKey="count"
                  stroke="#8884d8"
                  strokeWidth={2}
                />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card hoverEffect className="col-span-3">
          <CardHeader>
            <CardTitle>Message Status</CardTitle>
            <CardDescription>Delivery status of your messages</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {Object.keys(dashboard.messageStats ?? {}).length > 0 ? (
                Object.entries(dashboard.messageStats ?? {}).map(
                  ([status, count]) => {
                    const item = statusConfig[
                      status as keyof typeof statusConfig
                    ] || {
                      icon: Mail,
                      className: "bg-muted text-muted-foreground",
                    }

                    const Icon = item.icon

                    return (
                      <Card
                        key={status}
                        hoverEffect
                        className="hover:bg-accent"
                      >
                        <CardContent className="p-3">
                          <div className="flex items-center justify-between">
                            <div
                              className={cn(
                                "flex items-center gap-2",
                                item.textClassName
                              )}
                            >
                              <Icon className="h-4 w-4" />
                              <p className="text-sm font-medium">{status}</p>
                            </div>
                            <div className="font-medium">{count}</div>
                          </div>
                        </CardContent>
                      </Card>
                    )
                  }
                )
              ) : (
                <div className="flex h-24 items-center justify-center text-sm text-muted-foreground">
                  No message status data available.
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Recent Campaigns */}
      <Card hoverEffect>
        <CardHeader>
          <CardTitle>Recent Campaigns</CardTitle>
          <CardDescription>
            Your latest newsletter campaigns and their performance
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col gap-2">
            {dashboard.recentCampaigns.length > 0 ? (
              dashboard.recentCampaigns.map((campaign) => (
                <Link
                  key={campaign.id}
                  to={`/dashboard/campaigns/${campaign.id}`}
                >
                  <div className="flex items-center justify-between space-x-4 rounded-lg border p-4 hover:bg-accent duration-200">
                    <div className="flex flex-col space-y-1">
                      <p className="font-medium">{campaign.title}</p>
                      <p className="text-sm text-muted-foreground">
                        Sent to {campaign.sentMessages.toLocaleString()}{" "}
                        subscribers
                      </p>
                    </div>
                    <div className="flex items-center space-x-4 text-sm">
                      <div className="flex flex-col items-end space-y-1">
                        <p className="font-medium">
                          {campaign.deliveryRate.toFixed(1)}%
                        </p>
                        <p className="text-xs text-muted-foreground">
                          Delivery rate
                        </p>
                      </div>
                      <div className="flex flex-col items-end space-y-1">
                        <p className="font-medium">
                          {dayjs(campaign.completedAt).format("DD MMM YYYY")}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          Completed date
                        </p>
                      </div>
                      <Button variant="ghost" size="icon">
                        <ArrowRight className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </Link>
              ))
            ) : (
              <div className="flex h-24 items-center justify-center text-sm text-muted-foreground">
                No recent campaigns yet. Start one to see stats here.
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
