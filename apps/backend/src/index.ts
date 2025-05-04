export type * from "./app"
export type * from "../prisma/client"
export type * from "./types"

import { app } from "./app"
import { initializeCronJobs } from "./cron/cron"

initializeCronJobs()

const PORT = process.env.PORT || 5000

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`)
})
