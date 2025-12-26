import { faker } from "@faker-js/faker"
import { hashPassword } from "@src/utils/auth"
import { prisma } from "@src/utils/prisma"

export async function createUser() {
  const user = await prisma.user.create({
    data: {
      name: faker.person.fullName(),
      email: faker.internet.email(),
      password: await hashPassword("password123"),
      UserOrganizations: {
        create: {
          Organization: {
            create: {
              name: faker.company.name(),
              description: faker.lorem.sentence(),
              GeneralSettings: {
                create: {},
              },
              EmailDeliverySettings: {
                create: {
                  rateLimit: 100,
                },
              },
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
          },
        },
      },
    },
    include: {
      UserOrganizations: {
        select: {
          organizationId: true,
        },
      },
    },
  })

  const orgId = user.UserOrganizations[0]?.organizationId || ""
  if (!orgId) {
    throw new Error("Organization not found")
  }

  // New API Key
  const apiKey = await prisma.apiKey.create({
    data: {
      key: faker.string.uuid(),
      name: "Test API Key",
      Organization: {
        connect: {
          id: orgId,
        },
      },
    },
    select: {
      key: true,
    },
  })

  return { user, apiKey, orgId }
}
