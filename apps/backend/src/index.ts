import { app } from "./app"
import { initializeCronJobs } from "./cron/cron"
import { prisma } from "./utils/prisma"

export type * from "./app"
export type * from "../prisma/client"
export type * from "./types"

const cronController = initializeCronJobs()

const PORT = process.env.PORT || 5000

prisma.$connect().then(async () => {
  console.log("Connected to database")

  // For backwards compatibility, set all messages that have campaign status === "CANCELLED" to "CANCELLED"
  await prisma.message.updateMany({
    where: {
      Campaign: {
        status: "CANCELLED",
      },
      status: {
        in: ["QUEUED", "PENDING", "RETRYING"],
      },
    },
    data: {
      status: "CANCELLED",
    },
  })

  app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`)
  })
})

// Handle graceful shutdown
const shutdown = () => {
  console.log("Shutting down cron jobs...")
  cronController.stop()
  process.exit(0)
}

process.on("SIGINT", shutdown)
process.on("SIGTERM", shutdown)
