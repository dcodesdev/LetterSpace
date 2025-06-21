import cron from "node-cron"
import { sendMessagesCron } from "./sendMessages"
import { dailyMaintenanceCron } from "./dailyMaintenance"
import { processQueuedCampaigns } from "./processQueuedCampaigns"
import { cleanupWebhookLogsCron } from "./cleanupWebhookLogs"

type CronJob = {
  name: string
  schedule: string
  job: () => Promise<void>
  enabled: boolean
}

const sendMessagesJob: CronJob = {
  name: "send-queued-messages",
  schedule: "*/5 * * * * *", // Runs every 5 seconds
  job: sendMessagesCron,
  enabled: true,
}

const dailyMaintenanceJob: CronJob = {
  name: "daily-maintenance",
  schedule: "0 0 * * *", // Runs daily at midnight
  job: dailyMaintenanceCron,
  enabled: true,
}

const processQueuedCampaignsJob: CronJob = {
  name: "process-queued-campaigns",
  schedule: "* * * * * *", // Runs every second
  job: processQueuedCampaigns,
  enabled: true,
}

const cleanupWebhookLogsJob: CronJob = {
  name: "cleanup-webhook-logs",
  schedule: "0 1 * * *", // Runs daily at 1 AM
  job: cleanupWebhookLogsCron,
  enabled: true,
}

const cronJobs: CronJob[] = [
  sendMessagesJob,
  dailyMaintenanceJob,
  processQueuedCampaignsJob,
  cleanupWebhookLogsJob,
]

export const initializeCronJobs = () => {
  const scheduledJobs = cronJobs
    .filter((job) => job.enabled)
    .map((job) => {
      const task = cron.schedule(job.schedule, job.job)
      console.log(
        `Cron job '${job.name}' scheduled with cron expression: ${job.schedule}`
      )
      return { name: job.name, task }
    })

  console.log(`${scheduledJobs.length} cron jobs initialized`)

  return {
    jobs: scheduledJobs,
    stop: () => scheduledJobs.forEach(({ task }) => task.stop()),
  }
}
