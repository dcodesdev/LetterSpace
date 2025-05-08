import { useSession } from "@/hooks"
import { trpc } from "@/trpc"
import {
  CardContent,
  CardDescription,
  CardTitle,
  CardHeader,
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  ChartConfig,
  CardFooter,
  Card,
  Skeleton,
} from "@repo/ui"
import dayjs from "dayjs"
import { ArrowDown, TrendingUp } from "lucide-react"
import { Area, AreaChart, CartesianGrid, XAxis, YAxis } from "recharts"

const chartConfig = {
  count: {
    label: "Total Subscribers",
    color: "hsl(var(--chart-1))",
  },
} satisfies ChartConfig

export const SubscriberGrowthChart = () => {
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

  const { data: dashboard, isLoading: dashboardLoading } =
    trpc.dashboard.getStats.useQuery(
      {
        organizationId: organization?.id ?? "",
      },
      {
        enabled: !!organization?.id,
      }
    )

  const isLoading = analyticsLoading || dashboardLoading

  const maxCount = Math.max(
    ...(dashboard?.subscriberGrowth.map((item) => item.count) || [])
  )

  return (
    <Card hoverEffect className="col-span-4">
      <CardHeader>
        <CardTitle>Subscriber Growth</CardTitle>
        <CardDescription>
          New subscribers over time{" "}
          <span className="text-xs text-muted-foreground">(Daily)</span>
        </CardDescription>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <Skeleton className="h-[200px] w-full" />
        ) : (
          <ChartContainer config={chartConfig}>
            <AreaChart
              accessibilityLayer
              data={dashboard?.subscriberGrowth || []}
              margin={{
                left: 12,
                right: 12,
              }}
            >
              <CartesianGrid vertical={false} />
              <XAxis
                dataKey="date"
                tickLine={false}
                axisLine={false}
                tickMargin={8}
                tickFormatter={(value) => dayjs(value).format("DD MMM")}
              />
              <YAxis
                tickFormatter={(value) => value.toLocaleString()}
                tickLine={false}
                axisLine={false}
                tickMargin={8}
                tickCount={Math.min(maxCount, 10)}
              />
              <ChartTooltip
                cursor={false}
                content={<ChartTooltipContent indicator="dot" />}
              />
              <Area
                dataKey="count"
                type="natural"
                fill="var(--color-count)"
                fillOpacity={0.4}
                stroke="var(--color-count)"
                stackId="a"
              />
            </AreaChart>
          </ChartContainer>
        )}
      </CardContent>
      <CardFooter>
        {isLoading ? (
          <Skeleton className="h-10 w-full" />
        ) : (
          <div className="flex w-full items-start gap-2 text-sm">
            <div className="grid gap-2">
              <div className="flex items-center gap-2 font-medium leading-none">
                {(analytics?.subscribers?.newThisMonth || 0) >= 0 ? (
                  <>
                    Trending up by {analytics?.subscribers.newThisMonth}% this
                    month <TrendingUp className="h-4 w-4" />
                  </>
                ) : (
                  <>
                    Trending down by{" "}
                    {Math.abs(analytics?.subscribers.newThisMonth || 0)}% this
                    month <ArrowDown className="h-4 w-4" />
                  </>
                )}
              </div>
              <div className="flex items-center gap-2 leading-none text-muted-foreground">
                Last 30 days
              </div>
            </div>
          </div>
        )}
      </CardFooter>
    </Card>
  )
}
