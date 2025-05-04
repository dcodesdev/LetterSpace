import cron from "node-cron"
import { sendMessagesCron } from "./sendMessages"

type CronJob = {
  name: string
  schedule: string
  job: () => Promise<void>
}

const sendMessagesJob: CronJob = {
  name: "send-queued-messages",
  schedule: "*/5 * * * * *",
  job: sendMessagesCron,
}

const cronJobs: CronJob[] = [sendMessagesJob]

export const initializeCronJobs = () => {
  cronJobs.forEach((cronJob) => {
    cron.schedule(cronJob.schedule, cronJob.job)
  })

  console.log("Cron jobs initialized")
}
