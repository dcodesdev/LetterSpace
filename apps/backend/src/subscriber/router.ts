import { router } from "../trpc"
import {
  createSubscriber,
  deleteSubscriber,
  importSubscribers,
  publicUnsubscribe,
  unsubscribeToggle,
  updateSubscriber,
  verifyEmail,
} from "./mutation"
import { getSubscriber, listSubscribers } from "./query"

export const subscriberRouter = router({
  create: createSubscriber,
  update: updateSubscriber,
  delete: deleteSubscriber,
  get: getSubscriber,
  list: listSubscribers,
  import: importSubscribers,
  unsubscribe: publicUnsubscribe,
  unsubscribeToggle,
  verifyEmail,
})
