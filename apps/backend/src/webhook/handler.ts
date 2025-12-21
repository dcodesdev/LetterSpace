import express from "express"
import { prisma } from "../utils/prisma"
import { logger } from "../utils/logger"
import { runAuthorization } from "./authorization"
import { transformPayload } from "./transformer"
import { processWebhookEvent } from "./processor"
import { WebhookResult } from "./types"

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
  const startTime = Date.now()
  let responseCode: number | undefined
  let responseBody: string | undefined
  let errorMessage: string | undefined
  let transformResult: WebhookResult | null = null

  try {
    const webhookId = req.params.webhookId

    if (!webhookId) {
      responseCode = 400
      responseBody = JSON.stringify({ error: "Webhook ID is required" })
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
      responseCode = 404
      responseBody = JSON.stringify({ error: "Webhook not found or inactive" })
      res.status(404).json({ error: "Webhook not found or inactive" })
      return
    }

    // Run authorization code if provided
    if (webhook.authCode) {
      const authorized = await runAuthorization(webhook, req, webhookId)
      if (!authorized.success) {
        responseCode = authorized.status || 500
        responseBody = JSON.stringify({ error: authorized.error })
        errorMessage = authorized.error
        res.status(authorized.status || 500).json({ error: authorized.error })
        return
      }
    }

    // Transform the payload
    transformResult = await transformPayload(webhook, req, webhookId)
    if (!transformResult.success) {
      responseCode = transformResult.status || 500
      responseBody = JSON.stringify({ error: transformResult.error })
      errorMessage = transformResult.error
      res
        .status(transformResult.status || 500)
        .json({ error: transformResult.error })
      return
    }

    const transformedData = transformResult.data

    logger.debug("transformedData", transformedData)

    // Process the webhook event
    await processWebhookEvent(webhook, transformedData, webhookId)

    responseCode = 200
    responseBody = JSON.stringify({ success: true })
    res.status(200).json({ success: true })
  } catch (error) {
    logger.error("Webhook handler error:", error)
    responseCode = 500
    errorMessage = error instanceof Error ? error.message : String(error)
    responseBody = JSON.stringify({ error: "Internal server error" })
    res.status(500).json({ error: "Internal server error" })
  } finally {
    // Log the webhook request
    try {
      const duration = Date.now() - startTime
      await prisma.webhookLog.create({
        data: {
          webhookId: req.params.webhookId!,
          requestBody: req.body,
          transformedPayload: transformResult?.success
            ? transformResult?.data
            : undefined,
          responseCode,
          responseBody,
          error: errorMessage,
          duration,
        },
      })
    } catch (logError) {
      logger.error("Failed to log webhook request:", logError)
    }
  }
}
