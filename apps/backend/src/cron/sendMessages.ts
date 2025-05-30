import pMap from "p-map"
import { Mailer } from "../lib/Mailer"
import { logger } from "../utils/logger"
import { prisma } from "../utils/prisma"

import { cronJob } from "./cron.utils"
import { subSeconds } from "date-fns"

export const sendMessagesCron = cronJob("sendMessages", async () => {
  const organizations = await prisma.organization.findMany()

  for (const organization of organizations) {
    const [smtpSettings, emailSettings, generalSettings] = await Promise.all([
      prisma.smtpSettings.findFirst({
        where: { organizationId: organization.id },
      }),
      prisma.emailDeliverySettings.findFirst({
        where: { organizationId: organization.id },
      }),
      prisma.generalSettings.findFirst({
        where: { organizationId: organization.id },
      }),
    ])

    if (!smtpSettings || !emailSettings) {
      logger.warn(
        `Required settings not found for org ${organization.id}, skipping`
      )
      continue
    }

    const windowStart = subSeconds(new Date(), emailSettings.rateWindow)
    const sentInWindow = await prisma.message.count({
      where: {
        status: {
          in: ["PENDING", "SENT", "OPENED", "CLICKED"],
        },
        sentAt: {
          gte: windowStart,
        },
        Campaign: {
          organizationId: organization.id,
        },
      },
    })

    const availableSlots = Math.max(0, emailSettings.rateLimit - sentInWindow)

    if (availableSlots === 0) {
      continue
    }

    // Message status is now independent of campaign status.
    // This allows retrying individual messages even for completed campaigns.
    // We only filter by QUEUED and RETRYING message statuses.
    const messages = await prisma.message.findMany({
      where: {
        Campaign: {
          organizationId: organization.id,
        },
        OR: [
          { status: "QUEUED" },
          {
            status: "RETRYING",
            lastTriedAt: {
              lte: subSeconds(new Date(), emailSettings.retryDelay),
            },
          },
        ],
      },
      include: {
        Subscriber: {
          select: {
            email: true,
          },
        },
        Campaign: {
          select: {
            subject: true,
          },
        },
      },
      take: availableSlots,
    })

    const noMoreRetryingMessages = await prisma.message.count({
      where: {
        status: "RETRYING",
        Campaign: {
          organizationId: organization.id,
        },
      },
    })

    if (!messages.length && noMoreRetryingMessages === 0) {
      await prisma.campaign.updateMany({
        where: {
          status: "SENDING",
          organizationId: organization.id,
          Messages: {
            every: {
              status: {
                in: ["SENT", "FAILED", "OPENED", "CLICKED", "CANCELLED"],
              },
            },
          },
        },
        data: {
          status: "COMPLETED",
          completedAt: new Date(),
        },
      })
      continue
    }

    logger.info(`Found ${messages.length} messages to send`)

    const mailer = new Mailer({
      ...smtpSettings,
      timeout: emailSettings.connectionTimeout,
    })

    const fromName =
      smtpSettings.fromName ?? generalSettings?.defaultFromName ?? ""
    const fromEmail =
      smtpSettings.fromEmail ?? generalSettings?.defaultFromEmail ?? ""

    if (!fromName || !fromEmail) {
      logger.warn("No from name or email found, message will not be sent")
      continue
    }

    await pMap(
      messages,
      async (message) => {
        if (!message.Campaign.subject) {
          logger.warn("No subject found for campaign")
          return
        }

        await prisma.message.update({
          where: { id: message.id },
          data: { status: "PENDING" },
        })

        try {
          const result = await mailer.sendEmail({
            to: message.Subscriber.email,
            subject: message.Campaign.subject,
            html: message.content,
            from: `${fromName} <${fromEmail}>`,
          })

          await prisma.message.update({
            where: { id: message.id },
            data: {
              messageId: result.messageId,
              status: result.success
                ? "SENT"
                : message.tries >= emailSettings.maxRetries
                  ? "FAILED"
                  : "RETRYING",
              sentAt: result.success ? new Date() : undefined,
              tries: {
                increment: 1,
              },
              lastTriedAt: new Date(),
            },
          })
        } catch (error) {
          await prisma.message.update({
            where: { id: message.id },
            data: {
              status:
                message.tries >= emailSettings.maxRetries
                  ? "FAILED"
                  : "RETRYING",
              error: String(error),
              tries: {
                increment: 1,
              },
              lastTriedAt: new Date(),
            },
          })
        }
      },
      { concurrency: emailSettings.concurrency }
    )
  }
})
