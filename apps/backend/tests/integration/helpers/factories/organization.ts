import { faker } from "@faker-js/faker"
import { prisma } from "@src/utils/prisma"

type OrganizationOptions = {
  name?: string
  description?: string
}

export const createOrganization = async (data: OrganizationOptions = {}) => {
  return prisma.organization.create({
    data: {
      name: data.name ?? faker.company.name(),
      description: data.description ?? faker.lorem.sentence(),
      GeneralSettings: { create: {} },
      EmailDeliverySettings: { create: { rateLimit: 100 } },
      SmtpSettings: {
        create: {
          host: "smtp.test.com",
          port: 587,
          username: "test",
          password: "test",
          encryption: "STARTTLS",
        },
      },
    },
  })
}
