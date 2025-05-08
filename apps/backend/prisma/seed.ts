import { hashPassword } from "../src/utils/auth"
import { prisma } from "../src/utils/prisma"
import { SmtpEncryption } from "./client"
import dayjs from "dayjs"

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

  // Create 5000 subscribers
  const subscribers = Array.from({ length: 5000 }, (_, i) => ({
    name: `Subscriber ${i + 1}`,
    email: `subscriber${i + 1}@example.com`,
    organizationId: orgId,
    createdAt: dayjs().subtract(12, "days").toDate(),
  }))
  await prisma.subscriber.createMany({
    data: subscribers,
    skipDuplicates: true,
  })
  // Then 10 more for each day for 10 days
  const now = new Date()
  for (let d = 0; d < 10; d++) {
    const day = dayjs(now)
      .subtract(d + 1, "day")
      .toDate()

    const dailySubs = Array.from({ length: 10 }, (_, i) => ({
      name: `DailySub ${d + 1}-${i + 1}`,
      email: `dailysub${d + 1}-${i + 1}@example.com`,
      organizationId: orgId,
      createdAt: day,
      updatedAt: day,
    }))
    await prisma.subscriber.createMany({
      data: dailySubs,
      skipDuplicates: true,
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
