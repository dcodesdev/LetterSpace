import { router } from "../trpc"
import { getStats } from "./query"

export const statsRouter = router({
  getStats: getStats,
})
