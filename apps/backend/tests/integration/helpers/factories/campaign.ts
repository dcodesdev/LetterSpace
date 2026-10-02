import { faker } from "@faker-js/faker"
import type { CampaignStatus } from "@prisma-client"
import { prisma } from "@src/utils/prisma"

type CampaignOptions = {
  organizationId: string
  title?: string
  subject?: string
  content?: string
  status?: CampaignStatus
  scheduledAt?: Date
  templateId?: string
  listIds?: string[]
  createdAt?: Date
  completedAt?: Date
}

export const createCampaign = async (data: CampaignOptions) => {
  return prisma.campaign.create({
    data: {
      title: data.title ?? faker.lorem.words(3),
      subject: data.subject ?? faker.lorem.sentence(),
      content: data.content ?? "<p>Hello {{subscriber.email}}</p>",
      status: data.status,
      scheduledAt: data.scheduledAt,
      templateId: data.templateId,
      organizationId: data.organizationId,
      createdAt: data.createdAt,
      completedAt: data.completedAt,
      CampaignLists: {
        create: (data.listIds ?? []).map((listId) => ({ listId })),
      },
    },
    include: { CampaignLists: true },
  })
}
