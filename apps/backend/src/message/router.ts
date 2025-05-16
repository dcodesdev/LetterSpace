import { router } from "../trpc"
import { listMessages, getMessage } from "./query"
import { resendMessage } from "./mutation"

export const messageRouter = router({
  list: listMessages,
  get: getMessage,
  resend: resendMessage,
})
