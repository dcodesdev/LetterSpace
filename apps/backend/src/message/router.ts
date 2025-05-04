import { router } from "../trpc"
import { listMessages, getMessage } from "./query"

export const messageRouter = router({
  list: listMessages,
  get: getMessage,
})
