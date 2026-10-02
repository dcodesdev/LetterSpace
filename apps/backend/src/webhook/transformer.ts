import express from "express"
import { getQuickJS } from "quickjs-emscripten"
import { env } from "../constants"
import { logger } from "../utils/logger"
import { WebhookEventSchema, WebhookResult } from "./types"

// Transform webhook payload using custom code or default schema
export async function transformPayload(
  webhook: { transformCode?: string | null },
  req: express.Request,
  webhookId: string
): Promise<WebhookResult> {
  if (webhook.transformCode) {
    try {
      // Get QuickJS instance
      const QuickJS = await getQuickJS()
      const runtime = QuickJS.newRuntime()

      runtime.setMemoryLimit(parseInt(env.WEBHOOK_MEMORY_LIMIT, 10))
      runtime.setMaxStackSize(parseInt(env.WEBHOOK_MAX_STACK_SIZE, 10))

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

        const setupResult = context.evalCode(`
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

        // Execute the transform code with timeout protection
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

        // Set up timeout mechanism using QuickJS interrupt handler
        const TIMEOUT_MS = 5000 // 5 seconds timeout
        const deadline = Date.now() + TIMEOUT_MS
        let isTimedOut = false

        // evalCode blocks the event loop, so the deadline is checked from
        // inside the interrupt handler rather than from a timer
        runtime.setInterruptHandler(() => {
          if (Date.now() >= deadline) {
            isTimedOut = true
            return true // Interrupt execution
          }
          return false // Continue execution
        })

        let result
        try {
          result = context.evalCode(code)
        } finally {
          runtime.setInterruptHandler(() => false)
        }

        // Check if execution was interrupted due to timeout
        if (isTimedOut) {
          // The interrupted result still owns a handle; disposing the runtime
          // with it alive aborts the QuickJS module
          if (result.error) {
            result.error.dispose()
          } else {
            result.value.dispose()
          }
          throw new Error("Transform code execution timed out")
        }

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

          // Fall back to raw request body
          const fallbackValidation = WebhookEventSchema.safeParse(req.body)

          if (!fallbackValidation.success) {
            const validationErrors = fallbackValidation.error.errors
              .map((e) => `${e.path.join(".")}: ${e.message}`)
              .join(", ")
            logger.error(
              `Invalid webhook payload for webhook ${webhookId} (fallback):`,
              validationErrors
            )
            return {
              success: false,
              status: 400,
              error: `Payload validation error (transform returned undefined, using fallback): ${validationErrors}`,
            }
          }

          return { success: true, data: fallbackValidation.data }
        }

        try {
          const parsedData = JSON.parse(transformedJson)
          const validation = WebhookEventSchema.safeParse(parsedData)

          if (!validation.success) {
            const validationErrors = validation.error.errors
              .map((e) => `${e.path.join(".")}: ${e.message}`)
              .join(", ")
            logger.error(
              `Invalid transform result for webhook ${webhookId}:`,
              validationErrors
            )
            return {
              success: false,
              status: 500,
              error: `Transform validation error (transformed data invalid): ${validationErrors}`,
            }
          }

          return { success: true, data: validation.data }
        } catch (parseError) {
          const parseErrorMessage =
            parseError instanceof Error
              ? parseError.message
              : String(parseError)
          logger.error(
            `Failed to parse transform result for webhook ${webhookId}: ${transformedJson}. Parse error: ${parseErrorMessage}`
          )
          return {
            success: false,
            status: 500,
            error: `Invalid transform result (JSON parse failed): ${parseErrorMessage}`,
          }
        }
      } finally {
        // Ensure context and runtime are always disposed
        context.dispose()
        runtime.dispose()
      }
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error)
      logger.error(`Webhook ${webhookId} transform error:`, error)
      return {
        success: false,
        status: 500,
        error: `Transform code error: ${errorMessage}`,
      }
    }
  } else {
    // Default transformation - expect messageId and event fields
    const validation = WebhookEventSchema.safeParse(req.body)

    if (!validation.success) {
      const validationErrors = validation.error.errors
        .map((e) => `${e.path.join(".")}: ${e.message}`)
        .join(", ")
      logger.error(
        `Invalid webhook payload for webhook ${webhookId}:`,
        validationErrors
      )
      return {
        success: false,
        status: 400,
        error: `Payload validation error (no transform code): ${validationErrors}`,
      }
    }

    return { success: true, data: validation.data }
  }
}
