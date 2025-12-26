import { Card, CardContent, CardHeader, CardTitle } from "@repo/ui"
import { TrendingUp } from "lucide-react"
import { TrendingDown } from "lucide-react"
import { LucideIcon } from "lucide-react"
import { CardSkeleton } from "./card-skeleton"

export function StatCard({
  title,
  value,
  icon: Icon,
  change,
  subtitle,
  isLoading,
  smallTitle,
}: {
  title: string
  value: string | number
  icon: LucideIcon
  change?: number
  subtitle?: string
  isLoading: boolean
  smallTitle?: string
}) {
  const showChange = change !== undefined && !isNaN(change)

  return (
    <Card hoverEffect>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">
          {title}{" "}
          {smallTitle && (
            <small className="text-xs text-muted-foreground">
              ({smallTitle})
            </small>
          )}
        </CardTitle>
        <Icon className="h-4 w-4 text-muted-foreground" />
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <CardSkeleton />
        ) : (
          <>
            <div className="text-2xl font-bold">{value}</div>
            {showChange && (
              <div
                className={`flex items-center text-sm ${
                  change >= 0 ? "text-emerald-600" : "text-red-600"
                }`}
              >
                {change >= 0 ? (
                  <TrendingUp className="mr-1 h-4 w-4" />
                ) : (
                  <TrendingDown className="mr-1 h-4 w-4" />
                )}
                {change >= 0 ? "+" : "-"}
                {Math.abs(change).toFixed(1)}% from last month
              </div>
            )}
            {subtitle && (
              <p className="text-xs text-muted-foreground">{subtitle}</p>
            )}
          </>
        )}
      </CardContent>
    </Card>
  )
}
