import cron from "node-cron"
import { sendMessagesCron } from "./sendMessages"
import { midnightCleanupCron } from "./midnightCleanup"

type CronJob = {
  name: string
  schedule: string
  job: () => Promise<void>
  enabled: boolean
}

const sendMessagesJob: CronJob = {
  name: "send-queued-messages",
  schedule: "*/5 * * * * *",
  job: sendMessagesCron,
  enabled: true,
}

const midnightCleanupJob: CronJob = {
  name: "midnight-cleanup",
  schedule: "0 0 * * *",
  job: midnightCleanupCron,
  enabled: true,
}

const cronJobs: CronJob[] = [sendMessagesJob, midnightCleanupJob]

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
