import { faker } from "@faker-js/faker"
import { prisma } from "@src/utils/prisma"

type WebhookOptions = {
  organizationId: string
  name?: string
  isActive?: boolean
  authCode?: string
  transformCode?: string
}

export const createWebhook = async (data: WebhookOptions) => {
  return prisma.webhook.create({
    data: {
      name: data.name ?? faker.word.noun(),
      isActive: data.isActive ?? true,
      authCode: data.authCode,
      transformCode: data.transformCode,
      organizationId: data.organizationId,
    },
  })
}
