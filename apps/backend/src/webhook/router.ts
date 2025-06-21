import { router } from "../trpc"
import { listWebhooks, getWebhook, getWebhookLogs } from "./query"
import { createWebhook, updateWebhook, deleteWebhook } from "./mutation"

export const webhookRouter = router({
  list: listWebhooks,
  get: getWebhook,
  logs: getWebhookLogs,
  create: createWebhook,
  update: updateWebhook,
  delete: deleteWebhook,
})
