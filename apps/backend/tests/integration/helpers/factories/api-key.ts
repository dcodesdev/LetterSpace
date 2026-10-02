import { faker } from "@faker-js/faker"
import { prisma } from "@src/utils/prisma"

type ApiKeyOptions = {
  organizationId: string
  name?: string
  expiresAt?: Date
}

export const createApiKey = async (data: ApiKeyOptions) => {
  return prisma.apiKey.create({
    data: {
      key: faker.string.uuid(),
      name: data.name ?? "Test API Key",
      expiresAt: data.expiresAt,
      organizationId: data.organizationId,
    },
    // `key` is globally omitted on the client; tests need it.
    omit: { key: false },
  })
}
