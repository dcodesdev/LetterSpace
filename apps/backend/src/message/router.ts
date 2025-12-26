import { router } from "../trpc"
import { resendMessage } from "./mutation"
import { getMessage, listMessages } from "./query"

export const messageRouter = router({
  list: listMessages,
  get: getMessage,
  resend: resendMessage,
})
