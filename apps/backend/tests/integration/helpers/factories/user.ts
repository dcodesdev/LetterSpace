import { faker } from "@faker-js/faker"
import { hashPassword } from "@src/utils/auth"
import { prisma } from "@src/utils/prisma"
import { createApiKey } from "./api-key"

export const USER_PASSWORD = "password123"

export async function createUser() {
  const user = await prisma.user.create({
    data: {
      name: faker.person.fullName(),
      email: faker.internet.email(),
      password: await hashPassword(USER_PASSWORD),
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
    // `pwdVersion` is globally omitted on the client; tests need it to sign tokens.
    omit: { pwdVersion: false },
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

  const apiKey = await createApiKey({ organizationId: orgId })

  return { user, apiKey, orgId }
}
