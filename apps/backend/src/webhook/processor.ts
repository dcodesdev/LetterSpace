import { logger } from "../utils/logger"
import { prisma } from "../utils/prisma"
import { WebhookEvent, EVENT_STATUS_MAP } from "./types"

// Process webhook event and update message status
export async function processWebhookEvent(
  webhook: { organizationId: string },
  transformedData: WebhookEvent,
  webhookId: string
): Promise<{ success: boolean; status?: number; error?: string }> {
  // Find the message by external messageId
  const message = await prisma.message.findFirst({
    where: {
      messageId: transformedData.messageId,
      Campaign: {
        organizationId: webhook.organizationId,
      },
    },
  })

  if (!message) {
    logger.warn(`Message not found for messageId: ${transformedData.messageId}`)
    return {
      success: false,
      status: 404,
      error: "Message not found",
    }
  }

  // Update message status based on event
  const eventMapping = EVENT_STATUS_MAP[transformedData.event.toLowerCase()]

  if (!eventMapping) {
    logger.warn(`Unknown event type: ${transformedData.event}`)
    return {
      success: false,
      status: 400,
      error: "Unknown event type",
    }
  }

  const newStatus = eventMapping.status
  const errorMessage =
    transformedData.reason || eventMapping.errorDefault || null

  // Update the message
  await prisma.message.update({
    where: { id: message.id },
    data: {
      status: newStatus,
      error: errorMessage,
      updatedAt: new Date(),
    },
  })

  logger.debug(
    `Updated message ${message.id} status to ${newStatus} via webhook ${webhookId}`
  )

  return { success: true }
}
