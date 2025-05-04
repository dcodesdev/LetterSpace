import { hashPassword } from "../src/utils/auth"
import { prisma } from "../src/utils/prisma"
import { SmtpEncryption } from "./client"

async function seed() {
  if (!(await prisma.organization.findFirst())) {
    await prisma.organization.create({
      data: {
        name: "Test Organization",
        description: "Test Description",
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
            encryption: SmtpEncryption.STARTTLS,
          },
        },
      },
    })
  }

  const orgId = (
    await prisma.organization.findFirst({
      orderBy: {
        createdAt: "asc",
      },
    })
  )?.id

  if (!orgId) {
    throw new Error("not reachable")
  }

  if (!(await prisma.user.findFirst())) {
    await prisma.user.create({
      data: {
        name: "Admin",
        email: "admin@example.com",
        password: await hashPassword("password123"),
        UserOrganizations: {
          create: {
            organizationId: orgId,
          },
        },
      },
    })
  }
}

seed()
  .then(async () => {
    await prisma.$disconnect()
  })
  .catch(async (e) => {
    console.error(e)
    await prisma.$disconnect()
  })
