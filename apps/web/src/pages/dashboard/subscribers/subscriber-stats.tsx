import { Card, CardContent, CardHeader, CardTitle } from "@repo/ui"
import { ArrowDown, ArrowUp, Users } from "lucide-react"
import { CardSkeleton } from "@/components"
import { RouterOutput } from "@/types"

interface SubscriberStatsProps {
  analytics: RouterOutput["stats"]["getStats"] | undefined
  isLoading: boolean
}

export function SubscriberStats({
  analytics,
  isLoading,
}: SubscriberStatsProps) {
  return (
    <div className="grid gap-4 md:grid-cols-3">
      <Card hoverEffect>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">
            Active Subscribers
          </CardTitle>
          <Users className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          {isLoading || !analytics ? (
            <CardSkeleton />
          ) : (
            <>
              <div className="text-2xl font-bold">
                {analytics.subscribers.allTime.toLocaleString()}
              </div>
              <p className="text-xs text-muted-foreground inline-flex items-center gap-1">
                <span className="text-emerald-500 inline-flex items-center">
                  <ArrowUp className="mr-1 h-4 w-4" />+
                  {analytics.subscribers.newThisMonth.toLocaleString()}
                </span>{" "}
                this month
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
          <Users className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          {isLoading || !analytics ? (
            <CardSkeleton />
          ) : (
            <>
              <div className="text-2xl font-bold">
                {analytics.openRate.thisMonth.toFixed(1)}%
              </div>
              <p className="text-xs text-muted-foreground inline-flex items-center gap-1">
                {analytics.openRate.comparison >= 0 ? (
                  <span className="text-emerald-500 inline-flex items-center">
                    <ArrowUp className="mr-1 h-4 w-4" />+
                    {analytics.openRate.comparison.toFixed(1)}%
                  </span>
                ) : (
                  <span className="text-rose-500 inline-flex items-center">
                    <ArrowDown className="mr-1 h-4 w-4" />
                    {analytics.openRate.comparison.toFixed(1)}%
                  </span>
                )}{" "}
                vs last month
              </p>
            </>
          )}
        </CardContent>
      </Card>
      <Card hoverEffect>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">
            Unsubscribed{" "}
            <small className="text-xs text-muted-foreground">
              (Last 30 days)
            </small>
          </CardTitle>
          <Users className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          {isLoading || !analytics ? (
            <CardSkeleton />
          ) : (
            <>
              <div className="text-2xl font-bold">
                {analytics.unsubscribed.thisMonth.toLocaleString()}
              </div>
              <p className="text-xs text-muted-foreground inline-flex items-center gap-1">
                {analytics.unsubscribed.comparison <= 0 ? (
                  <span className="text-emerald-500 inline-flex items-center">
                    <ArrowDown className="mr-1 h-4 w-4" />-
                    {Math.abs(analytics.unsubscribed.comparison)}
                  </span>
                ) : (
                  <span className="text-rose-500 inline-flex items-center">
                    <ArrowUp className="mr-1 h-4 w-4" />+
                    {Math.abs(analytics.unsubscribed.comparison)}
                  </span>
                )}{" "}
                vs last month
              </p>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
