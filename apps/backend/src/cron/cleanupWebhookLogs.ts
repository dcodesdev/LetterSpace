import dayjs from "dayjs"
import { prisma } from "../utils/prisma"
import { cronJob } from "./cron.utils"

export const cleanupWebhookLogsCron = cronJob(
  "cleanup-webhook-logs",
  async () => {
    const organizations = await prisma.organization.findMany({
      include: {
        GeneralSettings: true,
      },
    })

    let totalDeletedLogs = 0

    for (const org of organizations) {
      const cleanupIntervalDays = org.GeneralSettings?.cleanupInterval ?? 90
      const cleanupOlderThanDate = dayjs()
        .subtract(cleanupIntervalDays, "days")
        .toDate()

      try {
        const deletedResult = await prisma.webhookLog.deleteMany({
          where: {
            Webhook: {
              organizationId: org.id,
            },
            createdAt: {
              lt: cleanupOlderThanDate,
            },
          },
        })

        if (deletedResult.count > 0) {
          console.log(
            `Webhook logs cleanup for org ${org.id}: Deleted ${deletedResult.count} logs older than ${cleanupIntervalDays} days.`
          )
          totalDeletedLogs += deletedResult.count
        }
      } catch (error) {
        console.error(`Error deleting webhook logs for org ${org.id}: ${error}`)
        continue
      }
    }

    if (totalDeletedLogs > 0) {
      console.log(
        `Webhook logs cleanup job finished. Total deleted logs: ${totalDeletedLogs}.`
      )
    } else {
      console.log("Webhook logs cleanup job finished. No logs to delete.")
    }
  }
)
