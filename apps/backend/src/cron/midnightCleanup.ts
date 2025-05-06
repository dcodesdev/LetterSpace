import { cronJob } from "./cron.utils"

export const midnightCleanupCron = cronJob("midnight-cleanup", async () => {
  console.log("Midnight cleanup job executed at:", new Date().toISOString())
})
