import { Card, CardContent, CardHeader, CardTitle, Badge } from "@repo/ui"
import { WEBHOOK_EVENTS, type WebhookEvent } from "@repo/shared"

interface WebhookEventsReferenceProps {
  title?: string
  events?: WebhookEvent[]
  className?: string
}

export function WebhookEventsReference({
  title = "Accepted Event Types",
  events = WEBHOOK_EVENTS,
  className,
}: WebhookEventsReferenceProps) {
  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="text-sm">{title}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="text-sm text-muted-foreground">
          <span>
            Your webhook transform code must return one of these event types.
            For detailed information about message statuses, see the{" "}
            <a
              href="https://docs.letterspace.app/webhooks"
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary underline hover:no-underline"
            >
              Message Statuses documentation
            </a>
            .
          </span>
        </div>
        <div className="space-y-2">
          {events.map((event) => (
            <div key={event.name} className="flex items-start gap-3">
              <div className="flex flex-wrap gap-1">
                <Badge variant="default">{event.name}</Badge>
                {event.aliases.map((alias) => (
                  <Badge key={alias} variant="secondary">
                    {alias}
                  </Badge>
                ))}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm text-muted-foreground">
                  {event.description}
                </p>
                <p className="text-xs text-muted-foreground">
                  → Sets status to{" "}
                  <code className="bg-muted px-1 rounded">{event.status}</code>
                </p>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}
