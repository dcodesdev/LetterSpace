import { z } from "zod"
import { MessageStatus } from "../../prisma/client"

// Schema for transformed webhook event
export const WebhookEventSchema = z.object({
  messageId: z.string(),
  event: z.string(),
  error: z.string().nullable().optional(),
})

// Schema for authorization result (must be boolean)
export const AuthorizationResultSchema = z.boolean()

export type WebhookEvent = z.infer<typeof WebhookEventSchema>

// Event mapping configuration
export const EVENT_STATUS_MAP: Record<
  string,
  { status: MessageStatus; errorDefault?: string }
> = {
  delivered: { status: "SENT" },
  sent: { status: "SENT" },
  opened: { status: "OPENED" },
  open: { status: "OPENED" },
  clicked: { status: "CLICKED" },
  click: { status: "CLICKED" },
  bounced: { status: "FAILED", errorDefault: "Email bounced" },
  bounce: { status: "FAILED", errorDefault: "Email bounced" },
  failed: { status: "FAILED", errorDefault: "Email bounced" },
  complained: { status: "COMPLAINED", errorDefault: "Spam complaint" },
  complaint: { status: "COMPLAINED", errorDefault: "Spam complaint" },
  spam: { status: "COMPLAINED", errorDefault: "Spam complaint" },
}

// Constants
export const MEMORY_LIMIT = 128 * 1024 * 1024 // 128MB
export const MAX_STACK_SIZE = 1024 * 1024 // 1MB

export interface WebhookResult {
  success: boolean
  status?: number
  error?: string
  data?: WebhookEvent
}
