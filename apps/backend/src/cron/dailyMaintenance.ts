import { cronJob } from "./cron.utils"
import { prisma } from "../utils/prisma"
import { subDays } from "date-fns"

export const dailyMaintenanceCron = cronJob("daily-maintenance", async () => {
  const thirtyDaysAgo = subDays(new Date(), 30)

  const result = await prisma.message.deleteMany({
    where: {
      createdAt: {
        lt: thirtyDaysAgo,
      },
    },
  })

  console.log(
    `Daily maintenance job: Deleted ${result.count} messages older than 30 days.`
  )
})
