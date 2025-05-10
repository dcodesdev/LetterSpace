import { cronJob } from "./cron.utils"
import { prisma } from "../utils/prisma"
import dayjs from "dayjs"

export const dailyMaintenanceCron = cronJob("daily-maintenance", async () => {
  const organizations = await prisma.organization.findMany({
    include: {
      GeneralSettings: true,
    },
  })

  let totalDeletedMessages = 0

  for (const org of organizations) {
    const cleanupIntervalDays = org.GeneralSettings?.cleanupInterval ?? 30
    const cleanupOlderThanDate = dayjs()
      .subtract(cleanupIntervalDays, "days")
      .toDate()

    try {
      const result = await prisma.message.deleteMany({
        where: {
          Campaign: {
            organizationId: org.id,
          },
          status: {
            in: ["SENT", "OPENED", "CLICKED", "FAILED"],
          },
          createdAt: {
            lt: cleanupOlderThanDate,
          },
        },
      })

      if (result.count > 0) {
        console.log(
          `Daily maintenance for org ${org.id}: Deleted ${result.count} messages older than ${cleanupIntervalDays} days.`
        )
        totalDeletedMessages += result.count
      }
    } catch (error) {
      console.error(`Error deleting messages for org ${org.id}: ${error}`)
      continue
    }
  }

  if (totalDeletedMessages > 0) {
    console.log(
      `Daily maintenance job finished. Total deleted messages: ${totalDeletedMessages}.`
    )
  } else {
    console.log("Daily maintenance job finished. No messages to delete.")
  }
})
