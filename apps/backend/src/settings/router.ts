import { router } from "../trpc"
import {
  createApiKey,
  createWebhook,
  deleteApiKey,
  deleteWebhook,
  testSmtp,
  updateEmailDelivery,
  updateGeneral,
  updateSmtp,
} from "./mutation"
import {
  getEmailDelivery,
  getGeneral,
  getSmtp,
  listApiKeys,
  listWebhooks,
} from "./query"

export const settingsRouter = router({
  getSmtp: getSmtp,
  updateSmtp: updateSmtp,
  testSmtp: testSmtp,
  getGeneral: getGeneral,
  updateGeneral: updateGeneral,

  // API Keys
  createApiKey: createApiKey,
  deleteApiKey: deleteApiKey,
  listApiKeys: listApiKeys,

  createWebhook: createWebhook,
  deleteWebhook: deleteWebhook,
  listWebhooks: listWebhooks,
  getEmailDelivery: getEmailDelivery,
  updateEmailDelivery: updateEmailDelivery,
})
