import { router } from "../trpc"
import { createWebhook, deleteWebhook, updateWebhook } from "./mutation"
import { getWebhook, getWebhookLogs, listWebhooks } from "./query"

export const webhookRouter = router({
  list: listWebhooks,
  get: getWebhook,
  logs: getWebhookLogs,
  create: createWebhook,
  update: updateWebhook,
  delete: deleteWebhook,
})
