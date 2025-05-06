import { cronJob } from "./cron.utils"
import { prisma } from "../utils/prisma"
import { subDays } from "date-fns"

export const midnightCleanupCron = cronJob("midnight-cleanup", async () => {
  const thirtyDaysAgo = subDays(new Date(), 30)

  const result = await prisma.message.deleteMany({
    where: {
      createdAt: {
        lt: thirtyDaysAgo,
      },
    },
  })

  console.log(
    `Midnight cleanup job: Deleted ${result.count} messages older than 30 days.`
  )
})
