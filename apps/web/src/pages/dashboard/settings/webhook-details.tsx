import { useParams, Link } from "react-router"
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  Button,
  Table,
  TableHeader,
  TableRow,
  TableHead,
  TableBody,
  TableCell,
  Badge,
  Skeleton,
} from "@repo/ui"
import { ArrowLeft, AlertCircle, CheckCircle2, XCircle } from "lucide-react"
import { trpc } from "@/trpc"
import { useSession } from "@/hooks"
import { format } from "date-fns"
import dayjs from "dayjs"
import relativeTime from "dayjs/plugin/relativeTime"
import { CopyButton } from "@/components"

dayjs.extend(relativeTime)

export function WebhookDetails() {
  const { id } = useParams<{ id: string }>()
  const { organization } = useSession()

  const { data: webhook, isLoading: webhookLoading } =
    trpc.webhook.get.useQuery(
      {
        id: id!,
        organizationId: organization?.id ?? "",
      },
      {
        enabled: !!id && !!organization?.id,
      }
    )

  const {
    data: logsData,
    isLoading: logsLoading,
    hasNextPage,
    fetchNextPage,
    isFetchingNextPage,
  } = trpc.webhook.logs.useInfiniteQuery(
    {
      webhookId: id!,
      organizationId: organization?.id ?? "",
      limit: 50,
    },
    {
      enabled: !!id && !!organization?.id,
      getNextPageParam: (lastPage) => lastPage.nextCursor,
    }
  )

  const logs = logsData?.pages.flatMap((page) => page.items) ?? []

  const getWebhookUrl = () => {
    // Get backend URL from environment or API configuration
    const baseUrl = import.meta.env.VITE_API_URL || window.location.origin
    return `${baseUrl}/webhook/${id}`
  }

  const getStatusIcon = (status?: number | null) => {
    if (!status)
      return <AlertCircle className="h-4 w-4 text-muted-foreground" />
    if (status >= 200 && status < 300)
      return <CheckCircle2 className="h-4 w-4 text-green-500" />
    if (status >= 400) return <XCircle className="h-4 w-4 text-red-500" />
    return <AlertCircle className="h-4 w-4 text-yellow-500" />
  }

  const getStatusVariant = (
    status?: number | null
  ): "default" | "secondary" | "destructive" | "outline" => {
    if (!status) return "secondary"
    if (status >= 200 && status < 300) return "default"
    if (status >= 400) return "destructive"
    return "outline"
  }

  if (webhookLoading) {
    return (
      <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
        <Skeleton className="h-8 w-48" />
        <Card>
          <CardHeader>
            <Skeleton className="h-6 w-32" />
            <Skeleton className="h-4 w-64" />
          </CardHeader>
          <CardContent>
            <Skeleton className="h-64 w-full" />
          </CardContent>
        </Card>
      </div>
    )
  }

  if (!webhook) {
    return (
      <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
        <Link to="/dashboard/settings?tab=webhooks">
          <Button variant="ghost" size="sm">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Webhooks
          </Button>
        </Link>
        <Card>
          <CardContent className="flex min-h-[400px] items-center justify-center">
            <div className="text-center">
              <AlertCircle className="mx-auto h-12 w-12 text-muted-foreground" />
              <h3 className="mt-4 text-lg font-semibold">Webhook not found</h3>
              <p className="text-sm text-muted-foreground">
                The webhook you're looking for doesn't exist or you don't have
                access to it.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
      <div className="flex items-center justify-between">
        <Link to="/dashboard/settings?tab=webhooks">
          <Button variant="ghost" size="sm">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Webhooks
          </Button>
        </Link>
        <Badge variant={webhook.isActive ? "default" : "secondary"}>
          {webhook.isActive ? "Active" : "Inactive"}
        </Badge>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{webhook.name}</CardTitle>
          <CardDescription>
            Webhook endpoint details and request logs
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium">Webhook URL</label>
              <div className="mt-1 flex items-center gap-2">
                <code className="flex-1 rounded bg-muted px-3 py-2 text-sm">
                  {getWebhookUrl()}
                </code>
                <CopyButton text={getWebhookUrl()} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium">Created</label>
                <p className="text-sm text-muted-foreground">
                  {format(
                    new Date(webhook.createdAt),
                    "MMM d, yyyy 'at' h:mm a"
                  )}
                </p>
              </div>
              <div>
                <label className="text-sm font-medium">Updated</label>
                <p className="text-sm text-muted-foreground">
                  {format(
                    new Date(webhook.updatedAt),
                    "MMM d, yyyy 'at' h:mm a"
                  )}
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Request Logs</CardTitle>
          <CardDescription>
            Recent webhook requests and their responses
          </CardDescription>
        </CardHeader>
        <CardContent>
          {logsLoading ? (
            <div className="space-y-2">
              {[...Array(5)].map((_, i) => (
                <Skeleton key={i} className="h-16 w-full" />
              ))}
            </div>
          ) : logs.length === 0 ? (
            <div className="flex min-h-[200px] items-center justify-center rounded-lg border border-dashed">
              <div className="text-center">
                <AlertCircle className="mx-auto h-8 w-8 text-muted-foreground" />
                <h3 className="mt-2 text-sm font-semibold">No requests yet</h3>
                <p className="text-sm text-muted-foreground">
                  This webhook hasn't received any requests.
                </p>
              </div>
            </div>
          ) : (
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Status</TableHead>
                    <TableHead>Timestamp</TableHead>
                    <TableHead>Duration</TableHead>
                    <TableHead>Request Body</TableHead>
                    <TableHead>Transformed Payload</TableHead>
                    <TableHead>Response</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {logs.map((log) => (
                    <TableRow key={log.id}>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          {getStatusIcon(log.responseCode)}
                          <Badge variant={getStatusVariant(log.responseCode)}>
                            {log.responseCode || "Pending"}
                          </Badge>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div>
                          <div className="text-sm">
                            {format(new Date(log.createdAt), "MMM d, yyyy")}
                          </div>
                          <div className="text-xs text-muted-foreground">
                            {format(new Date(log.createdAt), "h:mm:ss a")}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <span className="text-sm text-muted-foreground">
                          {log.duration ? `${log.duration}ms` : "-"}
                        </span>
                      </TableCell>
                      <TableCell>
                        <details className="cursor-pointer">
                          <summary className="text-sm text-muted-foreground hover:text-foreground">
                            View payload
                          </summary>
                          <pre className="mt-2 max-w-[300px] overflow-auto rounded bg-muted p-2 text-xs">
                            {JSON.stringify(log.requestBody, null, 2)}
                          </pre>
                        </details>
                      </TableCell>
                      <TableCell>
                        {log.transformedPayload ? (
                          <details className="cursor-pointer">
                            <summary className="text-sm text-muted-foreground hover:text-foreground">
                              View transformed
                            </summary>
                            <pre className="mt-2 max-w-[300px] overflow-auto rounded bg-muted p-2 text-xs">
                              {JSON.stringify(log.transformedPayload, null, 2)}
                            </pre>
                          </details>
                        ) : (
                          <span className="text-sm text-muted-foreground">
                            -
                          </span>
                        )}
                      </TableCell>
                      <TableCell>
                        {log.error ? (
                          <details className="cursor-pointer">
                            <summary className="text-sm text-red-500">
                              View error
                            </summary>
                            <pre className="mt-2 max-w-[300px] overflow-auto rounded bg-muted p-2 text-xs text-red-500">
                              {log.error}
                            </pre>
                          </details>
                        ) : log.responseBody ? (
                          <details className="cursor-pointer">
                            <summary className="text-sm text-muted-foreground hover:text-foreground">
                              View response
                            </summary>
                            <pre className="mt-2 max-w-[300px] overflow-auto rounded bg-muted p-2 text-xs">
                              {log.responseBody}
                            </pre>
                          </details>
                        ) : (
                          <span className="text-sm text-muted-foreground">
                            -
                          </span>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              {hasNextPage && (
                <div className="mt-4 flex justify-center">
                  <Button
                    variant="outline"
                    onClick={() => fetchNextPage()}
                    disabled={isFetchingNextPage}
                  >
                    {isFetchingNextPage ? "Loading..." : "Load more"}
                  </Button>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
