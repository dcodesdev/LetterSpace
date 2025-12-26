import express from "express"
import { getQuickJS } from "quickjs-emscripten"
import { logger } from "../utils/logger"

// Run authorization code in sandbox
export async function runAuthorization(
  webhook: { authCode: string | null },
  req: express.Request,
  webhookId: string
): Promise<{ success: boolean; status?: number; error?: string }> {
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
        return {
          success: false,
          status: 401,
          error: "Unauthorized",
        }
      }

      return { success: true }
    } finally {
      // Ensure context and runtime are always disposed
      context.dispose()
      runtime.dispose()
    }
  } catch (error) {
    logger.error(`Webhook ${webhookId} authorization error:`, error)
    return {
      success: false,
      status: 500,
      error: "Authorization code error",
    }
  }
}
