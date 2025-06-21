import express from "express"
import { prisma } from "../utils/prisma"
import { logger } from "../utils/logger"
import { runAuthorization } from "./authorization"
import { transformPayload } from "./transformer"
import { processWebhookEvent } from "./processor"

// TODO: Consider these improvements:
// 1. Add rate limiting to prevent webhook flooding
// 2. Add webhook event logging for audit trail
// 3. Consider QuickJS runtime pooling for performance
// 4. Add composite index on Message(messageId, Campaign.organizationId)
// 5. Add webhook retry mechanism for failed events

export const handleWebhook = async (
  req: express.Request,
  res: express.Response
) => {
  try {
    const webhookId = req.params.webhookId

    if (!webhookId) {
      res.status(400).json({ error: "Webhook ID is required" })
      return
    }

    const webhook = await prisma.webhook.findFirst({
      where: {
        id: webhookId,
        isActive: true,
      },
    })

    if (!webhook) {
      res.status(404).json({ error: "Webhook not found or inactive" })
      return
    }

    // Run authorization code if provided
    if (webhook.authCode) {
      const authorized = await runAuthorization(webhook, req, webhookId)
      if (!authorized.success) {
        res.status(authorized.status || 500).json({ error: authorized.error })
        return
      }
    }

    // Transform the payload
    const transformResult = await transformPayload(webhook, req, webhookId)
    if (!transformResult.success) {
      res
        .status(transformResult.status || 500)
        .json({ error: transformResult.error })
      return
    }

    const transformedData = transformResult.data!

    // Process the webhook event
    const processResult = await processWebhookEvent(
      webhook,
      transformedData,
      webhookId
    )

    if (!processResult.success) {
      res
        .status(processResult.status || 500)
        .json({ error: processResult.error })
      return
    }

    res.status(200).json({ success: true })
  } catch (error) {
    logger.error("Webhook handler error:", error)
    res.status(500).json({ error: "Internal server error" })
  }
}
