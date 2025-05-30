import express from "express"
import { prisma } from "../utils/prisma"
import { logger } from "../utils/logger"
import { VM } from "vm2"

interface WebhookEvent {
  messageId: string
  event: string
  timestamp?: string
  reason?: string
  [key: string]: unknown
}

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
      try {
        const vm = new VM({
          timeout: 5000,
          sandbox: {
            request: {
              headers: req.headers,
              body: req.body,
              query: req.query,
              params: req.params,
            },
          },
        })

        const code = `function authorize() { ${webhook.authCode} };authorize()`
        const authResult = vm.run(code)

        if (!authResult) {
          logger.warn(`Webhook ${webhookId} authorization failed`)
          res.status(401).json({ error: "Unauthorized" })
          return
        }
      } catch (error) {
        logger.error(`Webhook ${webhookId} authorization error:`, error)
        res.status(500).json({ error: "Authorization code error" })
        return
      }
    }

    // Transform the payload if transform code is provided
    let transformedData: WebhookEvent
    if (webhook.transformCode) {
      try {
        const vm = new VM({
          timeout: 5000,
          sandbox: {
            payload: req.body,
            headers: req.headers,
            query: req.query,
          },
        })

        const code = `function handler() { ${webhook.transformCode} };handler()`

        transformedData = vm.run(code)
      } catch (error) {
        logger.error(`Webhook ${webhookId} transform error:`, error)
        res.status(500).json({ error: "Transform code error" })
        return
      }
    } else {
      // Default transformation - expect messageId and event fields
      transformedData = req.body as WebhookEvent
    }

    if (!transformedData.messageId || !transformedData.event) {
      res.status(400).json({
        error: "Missing required fields: messageId and event",
      })
      return
    }

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
      logger.warn(
        `Message not found for messageId: ${transformedData.messageId}`
      )
      res.status(404).json({ error: "Message not found" })
      return
    }

    // Update message status based on event
    let newStatus = message.status
    let error: string | null = null

    switch (transformedData.event.toLowerCase()) {
      case "delivered":
      case "sent":
        newStatus = "SENT"
        break
      case "opened":
      case "open":
        newStatus = "OPENED"
        break
      case "clicked":
      case "click":
        newStatus = "CLICKED"
        break
      case "bounced":
      case "bounce":
      case "failed":
        newStatus = "FAILED"
        error = transformedData.reason || "Email bounced"
        break
      case "complained":
      case "complaint":
      case "spam":
        newStatus = "COMPLAINED"
        error = transformedData.reason || "Spam complaint"
        break
      default:
        logger.warn(`Unknown event type: ${transformedData.event}`)
        res.status(400).json({ error: "Unknown event type" })
        return
    }

    // Update the message
    await prisma.message.update({
      where: { id: message.id },
      data: {
        status: newStatus,
        error: error,
        updatedAt: new Date(),
      },
    })

    logger.info(
      `Updated message ${message.id} status to ${newStatus} via webhook ${webhookId}`
    )

    res.status(200).json({ success: true })
  } catch (error) {
    logger.error("Webhook handler error:", error)
    res.status(500).json({ error: "Internal server error" })
  }
}
