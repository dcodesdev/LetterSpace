export type * from "./app"
export type * from "../prisma/client"
export type * from "./types"

import { app } from "./app"
import { initializeCronJobs } from "./cron/cron"

const cronController = initializeCronJobs()

const PORT = process.env.PORT || 5000

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`)
})

// Handle graceful shutdown
const shutdown = () => {
  console.log("Shutting down cron jobs...")
  cronController.stop()
  process.exit(0)
}

process.on("SIGINT", shutdown)
process.on("SIGTERM", shutdown)
