import { faker } from "@faker-js/faker"
import { prisma } from "@src/utils/prisma"

type SubscriberOptions = {
  organizationId: string
  email?: string
  name?: string
  emailVerified?: boolean
  listIds?: string[]
  createdAt?: Date
}

export const createSubscriber = async (data: SubscriberOptions) => {
  return prisma.subscriber.create({
    data: {
      email: data.email ?? faker.internet.email(),
      name: data.name ?? faker.person.fullName(),
      emailVerified: data.emailVerified ?? true,
      organizationId: data.organizationId,
      createdAt: data.createdAt,
      ListSubscribers: {
        create: (data.listIds ?? []).map((listId) => ({ listId })),
      },
    },
    include: { ListSubscribers: true },
  })
}
