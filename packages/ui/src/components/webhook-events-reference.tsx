import { Card, CardContent, CardHeader, CardTitle, Badge } from "../components"

export interface WebhookEvent {
  name: string
  aliases: string[]
  status: string
  description: string
}

interface WebhookEventsReferenceProps {
  title?: string
  description?: string
  events?: WebhookEvent[]
  className?: string
}

const DEFAULT_EVENTS: WebhookEvent[] = [
  {
    name: "delivered",
    aliases: ["sent"],
    status: "SENT",
    description: "Email was successfully delivered",
  },
  {
    name: "opened",
    aliases: ["open"],
    status: "OPENED",
    description: "Email was opened by recipient",
  },
  {
    name: "clicked",
    aliases: ["click"],
    status: "CLICKED",
    description: "Link in email was clicked",
  },
  {
    name: "bounced",
    aliases: ["bounce", "failed"],
    status: "FAILED",
    description: "Email bounced or failed to deliver",
  },
  {
    name: "complained",
    aliases: ["complaint", "spam"],
    status: "COMPLAINED",
    description: "Recipient marked email as spam",
  },
]

export function WebhookEventsReference({
  title = "Accepted Event Types",
  description = "Your webhook transform code must return one of these event types:",
  events = DEFAULT_EVENTS,
  className,
}: WebhookEventsReferenceProps) {
  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="text-sm">{title}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <p className="text-sm text-muted-foreground">{description}</p>
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
