let isRunning = false

/**
 * A wrapper for cron jobs
 */
export function cronJob(name: string, cronFn: () => Promise<void>) {
  return async () => {
    if (isRunning) {
      return
    }

    isRunning = true

    try {
      await cronFn()
    } catch (error) {
      console.error("Cron Error:", `[${name}]`, error)
    } finally {
      isRunning = false
    }
  }
}
