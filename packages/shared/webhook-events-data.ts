export interface WebhookEvent {
  name: string
  aliases: string[]
  status: string
  description: string
}

export const WEBHOOK_EVENTS: WebhookEvent[] = [
  {
    name: "pending",
    aliases: ["delayed"],
    status: "PENDING",
    description: "Email is pending or delayed in the queue",
  },
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
