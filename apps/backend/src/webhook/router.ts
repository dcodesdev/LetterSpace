import { router } from "../trpc"
import { listWebhooks, getWebhook } from "./query"
import { createWebhook, updateWebhook, deleteWebhook } from "./mutation"

export const webhookRouter = router({
  list: listWebhooks,
  get: getWebhook,
  create: createWebhook,
  update: updateWebhook,
  delete: deleteWebhook,
})
