import express from "express"
import { prisma } from "../utils/prisma"
import { logger } from "../utils/logger"
import { getQuickJS } from "quickjs-emscripten"

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
        // Get QuickJS instance
        const QuickJS = await getQuickJS()
        const runtime = QuickJS.newRuntime()

        // Set memory limit (in bytes)
        runtime.setMemoryLimit(128 * 1024 * 1024) // 128MB

        // Set max stack size
        runtime.setMaxStackSize(1024 * 1024) // 1MB

        const context = runtime.newContext()

        try {
          // Create the sandbox environment
          const global = context.global

          // Pass data into the context
          const headersObj = context.newObject()
          for (const [key, value] of Object.entries(req.headers)) {
            const keyHandle = context.newString(key)
            const valueHandle = context.newString(String(value))
            context.setProp(headersObj, keyHandle, valueHandle)
            keyHandle.dispose()
            valueHandle.dispose()
          }
          context.setProp(global, "headers", headersObj)
          headersObj.dispose()

          const bodyStr = context.newString(JSON.stringify(req.body))
          context.setProp(global, "_bodyStr", bodyStr)
          bodyStr.dispose()

          const queryStr = context.newString(JSON.stringify(req.query))
          context.setProp(global, "_queryStr", queryStr)
          queryStr.dispose()

          const paramsStr = context.newString(JSON.stringify(req.params))
          context.setProp(global, "_paramsStr", paramsStr)
          paramsStr.dispose()

          // Add JSON parse/stringify to the context
          const setupResult = context.evalCode(`
            const JSON = {
              parse: (str) => eval('(' + str + ')'),
              stringify: (obj) => {
                if (obj === null) return 'null';
                if (typeof obj === 'string') return '"' + obj.replace(/"/g, '\\"') + '"';
                if (typeof obj === 'number' || typeof obj === 'boolean') return String(obj);
                if (Array.isArray(obj)) return '[' + obj.map(v => JSON.stringify(v)).join(',') + ']';
                if (typeof obj === 'object') {
                  const pairs = [];
                  for (const key in obj) {
                    if (obj.hasOwnProperty(key)) {
                      pairs.push('"' + key + '":' + JSON.stringify(obj[key]));
                    }
                  }
                  return '{' + pairs.join(',') + '}';
                }
                return undefined;
              }
            };
            const body = JSON.parse(_bodyStr);
            const query = JSON.parse(_queryStr);
            const params = JSON.parse(_paramsStr);
          `)

          if (setupResult.error) {
            const error = context.dump(setupResult.error)
            setupResult.error.dispose()
            throw new Error(
              typeof error === "object" ? JSON.stringify(error) : String(error)
            )
          }
          setupResult.value.dispose()

          // Execute the authorization code
          const code = `
            ${webhook.authCode}
            authorize(headers, body, query, params)
          `

          logger.debug(`Executing authorization code for webhook ${webhookId}`)
          const result = context.evalCode(code)

          if (result.error) {
            const error = context.dump(result.error)
            result.error.dispose()
            throw new Error(
              typeof error === "object" ? JSON.stringify(error) : String(error)
            )
          }

          const authResult = context.dump(result.value)
          result.value.dispose()

          logger.debug(
            `Authorization result for webhook ${webhookId}: ${authResult}`
          )

          global.dispose()

          if (!authResult) {
            logger.warn(`Webhook ${webhookId} authorization failed`)
            res.status(401).json({ error: "Unauthorized" })
            return
          }
        } finally {
          // Ensure context and runtime are always disposed
          context.dispose()
          runtime.dispose()
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
        // Get QuickJS instance
        const QuickJS = await getQuickJS()
        const runtime = QuickJS.newRuntime()

        // Set memory limit (in bytes)
        runtime.setMemoryLimit(128 * 1024 * 1024) // 128MB

        // Set max stack size
        runtime.setMaxStackSize(1024 * 1024) // 1MB

        const context = runtime.newContext()

        try {
          // Create the sandbox environment
          const global = context.global

          // Pass data into the context
          const payloadStr = context.newString(JSON.stringify(req.body))
          context.setProp(global, "_payloadStr", payloadStr)
          payloadStr.dispose()

          const headersObj = context.newObject()
          for (const [key, value] of Object.entries(req.headers)) {
            const keyHandle = context.newString(key)
            const valueHandle = context.newString(String(value))
            context.setProp(headersObj, keyHandle, valueHandle)
            keyHandle.dispose()
            valueHandle.dispose()
          }
          context.setProp(global, "headers", headersObj)
          headersObj.dispose()

          const queryStr = context.newString(JSON.stringify(req.query))
          context.setProp(global, "_queryStr", queryStr)
          queryStr.dispose()

          // Add JSON parse/stringify to the context
          const setupResult = context.evalCode(`
            const JSON = {
              parse: (str) => eval('(' + str + ')'),
              stringify: (obj) => {
                if (obj === null) return 'null';
                if (typeof obj === 'string') return '"' + obj.replace(/"/g, '\\"') + '"';
                if (typeof obj === 'number' || typeof obj === 'boolean') return String(obj);
                if (Array.isArray(obj)) return '[' + obj.map(v => JSON.stringify(v)).join(',') + ']';
                if (typeof obj === 'object') {
                  const pairs = [];
                  for (const key in obj) {
                    if (obj.hasOwnProperty(key)) {
                      pairs.push('"' + key + '":' + JSON.stringify(obj[key]));
                    }
                  }
                  return '{' + pairs.join(',') + '}';
                }
                return undefined;
              }
            };
            const payload = JSON.parse(_payloadStr);
            const query = JSON.parse(_queryStr);
          `)

          if (setupResult.error) {
            const error = context.dump(setupResult.error)
            setupResult.error.dispose()
            throw new Error(
              typeof error === "object" ? JSON.stringify(error) : String(error)
            )
          }
          setupResult.value.dispose()

          // Execute the transform code
          const code = `
            ${webhook.transformCode}
            const result = transform(payload, headers, query);
            // Remove undefined values before stringifying
            const cleanResult = {};
            for (const key in result) {
              if (result[key] !== undefined) {
                cleanResult[key] = result[key];
              }
            }
            JSON.stringify(cleanResult);
          `

          const result = context.evalCode(code)

          if (result.error) {
            const error = context.dump(result.error)
            result.error.dispose()
            throw new Error(
              typeof error === "object" ? JSON.stringify(error) : String(error)
            )
          }

          const transformedJson = context.dump(result.value)
          result.value.dispose()

          global.dispose()

          logger.debug(
            `Transform result for webhook ${webhookId}: ${transformedJson}`
          )

          // Parse the result
          if (
            transformedJson === undefined ||
            transformedJson === null ||
            transformedJson === "undefined"
          ) {
            logger.warn(
              `Transform function returned undefined for webhook ${webhookId}`
            )
            transformedData = req.body as WebhookEvent
          } else {
            try {
              transformedData = JSON.parse(transformedJson)
            } catch (parseError) {
              logger.error(
                `Failed to parse transform result for webhook ${webhookId}: ${transformedJson}`
              )
              throw new Error(`Transform function must return a valid object`)
            }
          }
        } finally {
          // Ensure context and runtime are always disposed
          context.dispose()
          runtime.dispose()
        }
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

    logger.debug(
      `Updated message ${message.id} status to ${newStatus} via webhook ${webhookId}`
    )

    res.status(200).json({ success: true })
  } catch (error) {
    logger.error("Webhook handler error:", error)
    res.status(500).json({ error: "Internal server error" })
  }
}
