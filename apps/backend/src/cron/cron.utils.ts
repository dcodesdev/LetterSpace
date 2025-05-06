const runningJobs = new Map<string, boolean>()

/**
 * A wrapper for cron jobs
 */
export function cronJob(name: string, cronFn: () => Promise<void>) {
  return async () => {
    if (runningJobs.get(name)) {
      return
    }

    runningJobs.set(name, true)

    try {
      await cronFn()
    } catch (error) {
      console.error("Cron Error:", `[${name}]`, error)
    } finally {
      runningJobs.set(name, false)
    }
  }
}
