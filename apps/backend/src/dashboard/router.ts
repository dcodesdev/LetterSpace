import { router } from "../trpc"
import { getDashboardStats } from "./query"

export const dashboardRouter = router({
  getStats: getDashboardStats,
})
