import { hashPassword } from "../src/utils/auth"
import { prisma } from "../src/utils/prisma"
import { SmtpEncryption, type Prisma } from "./client"
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

  // Create 5000 subscribers distributed over 2 years (from 2 years ago to today)
  const twoYearsAgo = dayjs().subtract(2, "years")
  const now = dayjs()
  const daysInTwoYears = now.diff(twoYearsAgo, "days")
  const subscribers = Array.from({ length: 5000 }, (_, i) => {
    const progress = i / (5000 - 1)
    const createdAt =
      i === 4999
        ? now.toDate()
        : twoYearsAgo
            .add(Math.floor(progress * daysInTwoYears), "days")
            .toDate()
    return {
      name: `Subscriber ${i + 1}`,
      email: `subscriber${i + 1}@example.com`,
      organizationId: orgId,
      createdAt,
    }
  })
  await prisma.subscriber.createMany({
    data: subscribers,
    skipDuplicates: true,
  })
  // Then 10 more for each day for 10 days, distributed over 2 years
  for (let d = 0; d < 10; d++) {
    const progress = d / 9
    const day =
      d === 9
        ? now.toDate()
        : twoYearsAgo
            .add(Math.floor(progress * daysInTwoYears), "days")
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

  // Create webhook
  const webhook = await prisma.webhook.upsert({
    where: {
      id: "test-webhook-1",
    },
    update: {},
    create: {
      id: "test-webhook-1",
      name: "Test Webhook",
      isActive: true,
      organizationId: orgId,
      authCode: `
        function authorize(headers, body, query, params) {
          // Example authorization logic
          return headers['x-api-key'] === 'test-key';
        }
      `,
      transformCode: `
        function transform(payload, headers, query) {
          // Example transform logic
          return {
            messageId: payload.messageId || payload['Message-ID'],
            event: payload.event || payload.Type || 'delivered'
          };
        }
      `,
    },
  })

  // Create webhook logs with different statuses and data
  const webhookLogs: Prisma.WebhookLogCreateManyInput[] = []
  const events = [
    "delivered",
    "bounced",
    "complained",
    "opened",
    "clicked",
    "failed",
  ]
  const providers = ["ses", "sendgrid", "postmark", "mailgun", "resend"]
  const statusCodes = [200, 201, 400, 401, 404, 500, 502, 503]

  // Create 200 webhook logs with varied data
  for (let i = 0; i < 200; i++) {
    const event = events[Math.floor(Math.random() * events.length)]
    const provider = providers[Math.floor(Math.random() * providers.length)]
    const statusCode =
      statusCodes[Math.floor(Math.random() * statusCodes.length)]
    const isSuccess = statusCode >= 200 && statusCode < 300
    const hasTransform = Math.random() > 0.3
    const hasError = statusCode >= 400

    const requestBody = {
      provider,
      messageId: `msg-${i}-${Date.now()}`,
      event,
      timestamp: dayjs().subtract(i, "minutes").toISOString(),
      recipient: `subscriber${Math.floor(Math.random() * 100)}@example.com`,
      metadata: {
        campaignId: `campaign-${Math.floor(Math.random() * 10)}`,
        source: provider,
        ip: `192.168.1.${Math.floor(Math.random() * 255)}`,
      },
    }

    const transformedPayload = hasTransform
      ? {
          messageId: requestBody.messageId,
          event:
            event === "delivered"
              ? "delivered"
              : event === "bounced"
                ? "bounce"
                : event === "complained"
                  ? "complaint"
                  : event === "opened"
                    ? "open"
                    : event === "clicked"
                      ? "click"
                      : "failed",
        }
      : null

    webhookLogs.push({
      webhookId: webhook.id,
      requestBody,
      transformedPayload: transformedPayload || undefined,
      responseCode: statusCode,
      responseBody: isSuccess
        ? JSON.stringify({ status: "ok", processed: true })
        : hasError
          ? JSON.stringify({ error: `Error processing webhook: ${statusCode}` })
          : null,
      error: hasError
        ? `HTTP ${statusCode}: ${
            statusCode === 400
              ? "Bad Request - Invalid payload format"
              : statusCode === 401
                ? "Unauthorized - Invalid API key"
                : statusCode === 404
                  ? "Not Found - Message not found"
                  : statusCode === 500
                    ? "Internal Server Error"
                    : statusCode === 502
                      ? "Bad Gateway"
                      : statusCode === 503
                        ? "Service Unavailable"
                        : "Unknown error"
          }`
        : null,
      duration: Math.floor(Math.random() * 2000) + 50, // 50ms to 2050ms
      createdAt: dayjs().subtract(i, "minutes").toDate(),
    })
  }

  // Create webhook logs in batches to avoid potential issues
  const batchSize = 50
  for (let i = 0; i < webhookLogs.length; i += batchSize) {
    const batch = webhookLogs.slice(i, i + batchSize)
    await prisma.webhookLog.createMany({
      data: batch,
    })
  }

  console.log(`Created ${webhookLogs.length} webhook logs for testing`)
}

seed()
  .then(async () => {
    await prisma.$disconnect()
  })
  .catch(async (e) => {
    console.error(e)
    await prisma.$disconnect()
  })
