import { router } from "../trpc"
import {
  getSmtp,
  getGeneral,
  listApiKeys,
  listWebhooks,
  getEmailDelivery,
} from "./query"
import {
  updateSmtp,
  testSmtp,
  updateGeneral,
  createApiKey,
  deleteApiKey,
  createWebhook,
  deleteWebhook,
  updateEmailDelivery,
} from "./mutation"

export const settingsRouter = router({
  getSmtp: getSmtp,
  updateSmtp: updateSmtp,
  testSmtp: testSmtp,
  getGeneral: getGeneral,
  updateGeneral: updateGeneral,
  createApiKey: createApiKey,
  deleteApiKey: deleteApiKey,
  listApiKeys: listApiKeys,
  createWebhook: createWebhook,
  deleteWebhook: deleteWebhook,
  listWebhooks: listWebhooks,
  getEmailDelivery: getEmailDelivery,
  updateEmailDelivery: updateEmailDelivery,
})
