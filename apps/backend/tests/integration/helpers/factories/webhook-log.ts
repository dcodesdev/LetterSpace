import { prisma } from "@src/utils/prisma"

type WebhookLogOptions = {
  webhookId: string
  requestBody?: object
  responseCode?: number
  createdAt?: Date
}

export const createWebhookLog = async (data: WebhookLogOptions) => {
  return prisma.webhookLog.create({
    data: {
      webhookId: data.webhookId,
      requestBody: data.requestBody ?? { event: "delivered" },
      responseCode: data.responseCode ?? 200,
      createdAt: data.createdAt,
    },
  })
}
