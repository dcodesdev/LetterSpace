import {
  createCampaign,
  createMessage,
  createOrganization,
  createSubscriber,
  createWebhook,
} from "@helpers/factories"
import { sendMessagesCron } from "@src/cron/sendMessages"
import { prisma } from "@src/utils/prisma"
import { subSeconds } from "date-fns"
import { beforeEach, describe, expect, it, vi } from "vitest"

const mocks = vi.hoisted(() => {
  const sendMail = vi.fn()
  return { sendMail, createTransport: vi.fn(() => ({ sendMail })) }
})

vi.mock("nodemailer", () => ({
  default: { createTransport: mocks.createTransport },
}))

const { sendMail, createTransport } = mocks

const accepted = (messageId = "<smtp-id@test>") => ({
  accepted: ["to@example.com"],
  rejected: [],
  messageId,
})

const rejected = () => ({
  accepted: [],
  rejected: ["to@example.com"],
  messageId: "<rejected@test>",
})

/** An organization whose SMTP settings are complete enough to send. */
const seedSendableOrg = async (emailSettings: Record<string, number> = {}) => {
  const org = await createOrganization()

  await prisma.smtpSettings.updateMany({
    where: { organizationId: org.id },
    data: { fromName: "LetterSpace", fromEmail: "hello@example.com" },
  })

  if (Object.keys(emailSettings).length > 0) {
    await prisma.emailDeliverySettings.updateMany({
      where: { organizationId: org.id },
      data: emailSettings,
    })
  }

  const subscriber = await createSubscriber({ organizationId: org.id })
  const campaign = await createCampaign({
    organizationId: org.id,
    status: "SENDING",
    subject: "Hello there",
  })

  return { org, subscriber, campaign }
}

beforeEach(() => {
  vi.clearAllMocks()
  sendMail.mockResolvedValue(accepted())
  vi.spyOn(console, "log").mockImplementation(() => {})
  vi.spyOn(console, "warn").mockImplementation(() => {})
  vi.spyOn(console, "error").mockImplementation(() => {})
})

describe("sendMessages cron", () => {
  describe("no-op cases", () => {
    it("does nothing with no organizations", async () => {
      await sendMessagesCron()

      expect(createTransport).not.toHaveBeenCalled()
      expect(sendMail).not.toHaveBeenCalled()
    })

    it("does nothing with an empty queue", async () => {
      await seedSendableOrg()

      await sendMessagesCron()

      expect(sendMail).not.toHaveBeenCalled()
    })

    it("skips an organization with no smtp settings", async () => {
      const { org, subscriber, campaign } = await seedSendableOrg()
      await prisma.smtpSettings.deleteMany({
        where: { organizationId: org.id },
      })
      const message = await createMessage({
        campaignId: campaign.id,
        subscriberId: subscriber.id,
        status: "QUEUED",
      })

      await sendMessagesCron()

      expect(sendMail).not.toHaveBeenCalled()
      const stored = await prisma.message.findUniqueOrThrow({
        where: { id: message.id },
      })
      expect(stored.status).toBe("QUEUED")
    })

    it("skips an organization with no email delivery settings", async () => {
      const { org, subscriber, campaign } = await seedSendableOrg()
      await prisma.emailDeliverySettings.deleteMany({
        where: { organizationId: org.id },
      })
      await createMessage({
        campaignId: campaign.id,
        subscriberId: subscriber.id,
        status: "QUEUED",
      })

      await sendMessagesCron()

      expect(sendMail).not.toHaveBeenCalled()
    })

    it("does not send when no from name or email is configured", async () => {
      const { org, subscriber, campaign } = await seedSendableOrg()
      await prisma.smtpSettings.updateMany({
        where: { organizationId: org.id },
        data: { fromName: null, fromEmail: null },
      })
      const message = await createMessage({
        campaignId: campaign.id,
        subscriberId: subscriber.id,
        status: "QUEUED",
      })

      await sendMessagesCron()

      expect(sendMail).not.toHaveBeenCalled()
      const stored = await prisma.message.findUniqueOrThrow({
        where: { id: message.id },
      })
      expect(stored.status).toBe("QUEUED")
    })

    it("falls back to the general settings from name and email", async () => {
      const { org, subscriber, campaign } = await seedSendableOrg()
      await prisma.smtpSettings.updateMany({
        where: { organizationId: org.id },
        data: { fromName: null, fromEmail: null },
      })
      await prisma.generalSettings.updateMany({
        where: { organizationId: org.id },
        data: {
          defaultFromName: "Fallback",
          defaultFromEmail: "fallback@example.com",
        },
      })
      await createMessage({
        campaignId: campaign.id,
        subscriberId: subscriber.id,
        status: "QUEUED",
      })

      await sendMessagesCron()

      expect(sendMail).toHaveBeenCalledWith(
        expect.objectContaining({ from: "Fallback <fallback@example.com>" })
      )
    })
  })

  describe("sending", () => {
    it("sends a queued message and marks it SENT", async () => {
      const { subscriber, campaign } = await seedSendableOrg()
      const message = await createMessage({
        campaignId: campaign.id,
        subscriberId: subscriber.id,
        status: "QUEUED",
        content: "<p>Body</p>",
      })

      await sendMessagesCron()

      expect(sendMail).toHaveBeenCalledWith({
        to: [subscriber.email],
        subject: "Hello there",
        from: "LetterSpace <hello@example.com>",
        html: "<p>Body</p>",
        text: undefined,
      })

      const stored = await prisma.message.findUniqueOrThrow({
        where: { id: message.id },
      })
      expect(stored.status).toBe("SENT")
      expect(stored.sentAt).toBeInstanceOf(Date)
      expect(stored.tries).toBe(1)
      expect(stored.lastTriedAt).toBeInstanceOf(Date)
      expect(stored.messageId).toBe("smtp-id@test")
    })

    it("uses the smtp settings for the transport", async () => {
      const { subscriber, campaign } = await seedSendableOrg()
      await createMessage({
        campaignId: campaign.id,
        subscriberId: subscriber.id,
        status: "QUEUED",
      })

      await sendMessagesCron()

      expect(createTransport).toHaveBeenCalledWith(
        expect.objectContaining({
          host: "smtp.test.com",
          port: 587,
          auth: { user: "test", pass: "test" },
        })
      )
    })

    it("marks the message AWAITING_WEBHOOK when an active webhook exists", async () => {
      const { org, subscriber, campaign } = await seedSendableOrg()
      await createWebhook({ organizationId: org.id, isActive: true })
      const message = await createMessage({
        campaignId: campaign.id,
        subscriberId: subscriber.id,
        status: "QUEUED",
      })

      await sendMessagesCron()

      const stored = await prisma.message.findUniqueOrThrow({
        where: { id: message.id },
      })
      expect(stored.status).toBe("AWAITING_WEBHOOK")
    })

    it("ignores an inactive webhook", async () => {
      const { org, subscriber, campaign } = await seedSendableOrg()
      await createWebhook({ organizationId: org.id, isActive: false })
      const message = await createMessage({
        campaignId: campaign.id,
        subscriberId: subscriber.id,
        status: "QUEUED",
      })

      await sendMessagesCron()

      const stored = await prisma.message.findUniqueOrThrow({
        where: { id: message.id },
      })
      expect(stored.status).toBe("SENT")
    })

    it("skips a message whose campaign has no subject", async () => {
      const { org, subscriber } = await seedSendableOrg()
      const campaign = await createCampaign({
        organizationId: org.id,
        status: "SENDING",
      })
      await prisma.campaign.update({
        where: { id: campaign.id },
        data: { subject: null },
      })
      const message = await createMessage({
        campaignId: campaign.id,
        subscriberId: subscriber.id,
        status: "QUEUED",
      })

      await sendMessagesCron()

      expect(sendMail).not.toHaveBeenCalled()
      const stored = await prisma.message.findUniqueOrThrow({
        where: { id: message.id },
      })
      expect(stored.status).toBe("QUEUED")
    })

    it("only sends messages belonging to its own organization", async () => {
      const first = await seedSendableOrg()
      const second = await seedSendableOrg()

      await createMessage({
        campaignId: first.campaign.id,
        subscriberId: first.subscriber.id,
        status: "QUEUED",
      })
      await createMessage({
        campaignId: second.campaign.id,
        subscriberId: second.subscriber.id,
        status: "QUEUED",
      })

      await sendMessagesCron()

      expect(sendMail).toHaveBeenCalledTimes(2)
      expect(createTransport).toHaveBeenCalledTimes(2)
    })
  })

  describe("rate limiting", () => {
    it("sends no more than the remaining slots in the window", async () => {
      const { subscriber, campaign } = await seedSendableOrg({ rateLimit: 2 })

      for (let i = 0; i < 5; i++) {
        await createMessage({
          campaignId: campaign.id,
          subscriberId: subscriber.id,
          status: "QUEUED",
        })
      }

      await sendMessagesCron()

      expect(sendMail).toHaveBeenCalledTimes(2)
      expect(await prisma.message.count({ where: { status: "SENT" } })).toBe(2)
      expect(await prisma.message.count({ where: { status: "QUEUED" } })).toBe(
        3
      )
    })

    it("counts messages already sent inside the window against the limit", async () => {
      const { subscriber, campaign } = await seedSendableOrg({ rateLimit: 2 })

      await createMessage({
        campaignId: campaign.id,
        subscriberId: subscriber.id,
        status: "SENT",
        sentAt: new Date(),
      })
      await createMessage({
        campaignId: campaign.id,
        subscriberId: subscriber.id,
        status: "QUEUED",
      })
      await createMessage({
        campaignId: campaign.id,
        subscriberId: subscriber.id,
        status: "QUEUED",
      })

      await sendMessagesCron()

      expect(sendMail).toHaveBeenCalledTimes(1)
    })

    it("sends nothing when the limit is already exhausted", async () => {
      const { subscriber, campaign } = await seedSendableOrg({ rateLimit: 1 })

      await createMessage({
        campaignId: campaign.id,
        subscriberId: subscriber.id,
        status: "SENT",
        sentAt: new Date(),
      })
      await createMessage({
        campaignId: campaign.id,
        subscriberId: subscriber.id,
        status: "QUEUED",
      })

      await sendMessagesCron()

      expect(sendMail).not.toHaveBeenCalled()
    })

    it("ignores sends that fall outside the rate window", async () => {
      const { subscriber, campaign } = await seedSendableOrg({
        rateLimit: 1,
        rateWindow: 60,
      })

      await createMessage({
        campaignId: campaign.id,
        subscriberId: subscriber.id,
        status: "SENT",
        sentAt: subSeconds(new Date(), 120),
      })
      await createMessage({
        campaignId: campaign.id,
        subscriberId: subscriber.id,
        status: "QUEUED",
      })

      await sendMessagesCron()

      expect(sendMail).toHaveBeenCalledTimes(1)
    })
  })

  describe("retries and failures", () => {
    it("marks a rejected send RETRYING while tries remain", async () => {
      const { subscriber, campaign } = await seedSendableOrg({ maxRetries: 3 })
      sendMail.mockResolvedValue(rejected())
      const message = await createMessage({
        campaignId: campaign.id,
        subscriberId: subscriber.id,
        status: "QUEUED",
      })

      await sendMessagesCron()

      const stored = await prisma.message.findUniqueOrThrow({
        where: { id: message.id },
      })
      expect(stored.status).toBe("RETRYING")
      expect(stored.tries).toBe(1)
      expect(stored.sentAt).toBeNull()
    })

    it("marks a rejected send FAILED once maxRetries is reached", async () => {
      const { subscriber, campaign } = await seedSendableOrg({ maxRetries: 3 })
      sendMail.mockResolvedValue(rejected())
      const message = await createMessage({
        campaignId: campaign.id,
        subscriberId: subscriber.id,
        status: "QUEUED",
        tries: 3,
      })

      await sendMessagesCron()

      const stored = await prisma.message.findUniqueOrThrow({
        where: { id: message.id },
      })
      expect(stored.status).toBe("FAILED")
      expect(stored.tries).toBe(4)
    })

    it("records the error when the transport throws", async () => {
      const { subscriber, campaign } = await seedSendableOrg()
      sendMail.mockRejectedValue(new Error("smtp down"))
      const message = await createMessage({
        campaignId: campaign.id,
        subscriberId: subscriber.id,
        status: "QUEUED",
      })

      await sendMessagesCron()

      const stored = await prisma.message.findUniqueOrThrow({
        where: { id: message.id },
      })
      expect(stored.status).toBe("RETRYING")
      expect(stored.error).toContain("smtp down")
      expect(stored.tries).toBe(1)
    })

    it("marks a throwing send FAILED once maxRetries is reached", async () => {
      const { subscriber, campaign } = await seedSendableOrg({ maxRetries: 1 })
      sendMail.mockRejectedValue(new Error("smtp down"))
      const message = await createMessage({
        campaignId: campaign.id,
        subscriberId: subscriber.id,
        status: "QUEUED",
        tries: 1,
      })

      await sendMessagesCron()

      const stored = await prisma.message.findUniqueOrThrow({
        where: { id: message.id },
      })
      expect(stored.status).toBe("FAILED")
    })

    it("makes exactly maxRetries attempts before marking FAILED", async () => {
      const { subscriber, campaign } = await seedSendableOrg({
        maxRetries: 3,
        retryDelay: 0,
      })
      sendMail.mockResolvedValue(rejected())
      const message = await createMessage({
        campaignId: campaign.id,
        subscriberId: subscriber.id,
        status: "QUEUED",
      })

      for (let i = 0; i < 5; i++) {
        await sendMessagesCron()
      }

      expect(sendMail).toHaveBeenCalledTimes(3)
      const stored = await prisma.message.findUniqueOrThrow({
        where: { id: message.id },
      })
      expect(stored.status).toBe("FAILED")
      expect(stored.tries).toBe(3)
    })

    it("picks up a RETRYING message once the retry delay has elapsed", async () => {
      const { subscriber, campaign } = await seedSendableOrg({ retryDelay: 60 })
      const message = await createMessage({
        campaignId: campaign.id,
        subscriberId: subscriber.id,
        status: "RETRYING",
        tries: 1,
        lastTriedAt: subSeconds(new Date(), 120),
      })

      await sendMessagesCron()

      expect(sendMail).toHaveBeenCalledTimes(1)
      const stored = await prisma.message.findUniqueOrThrow({
        where: { id: message.id },
      })
      expect(stored.status).toBe("SENT")
    })

    it("leaves a RETRYING message alone before the retry delay", async () => {
      const { subscriber, campaign } = await seedSendableOrg({
        retryDelay: 300,
      })
      const message = await createMessage({
        campaignId: campaign.id,
        subscriberId: subscriber.id,
        status: "RETRYING",
        tries: 1,
        lastTriedAt: new Date(),
      })

      await sendMessagesCron()

      expect(sendMail).not.toHaveBeenCalled()
      const stored = await prisma.message.findUniqueOrThrow({
        where: { id: message.id },
      })
      expect(stored.status).toBe("RETRYING")
    })
  })

  describe("cancellation", () => {
    it("does not send a message cancelled between fetch and claim", async () => {
      const { subscriber, campaign } = await seedSendableOrg()
      const message = await createMessage({
        campaignId: campaign.id,
        subscriberId: subscriber.id,
        status: "QUEUED",
      })
      const findMany = prisma.message.findMany
      // vi.spyOn can't restore methods on the extended client
      prisma.message.findMany = (async (
        args: Parameters<typeof findMany>[0]
      ) => {
        const result = await findMany(args)
        await prisma.message.update({
          where: { id: message.id },
          data: { status: "CANCELLED" },
        })
        return result
      }) as typeof findMany

      try {
        await sendMessagesCron()
      } finally {
        prisma.message.findMany = findMany
      }

      expect(sendMail).not.toHaveBeenCalled()
      const stored = await prisma.message.findUniqueOrThrow({
        where: { id: message.id },
      })
      expect(stored.status).toBe("CANCELLED")
    })

    it("does not send queued messages of a cancelled campaign", async () => {
      const { subscriber, campaign } = await seedSendableOrg()
      await prisma.campaign.update({
        where: { id: campaign.id },
        data: { status: "CANCELLED" },
      })
      const message = await createMessage({
        campaignId: campaign.id,
        subscriberId: subscriber.id,
        status: "QUEUED",
      })

      await sendMessagesCron()

      expect(sendMail).not.toHaveBeenCalled()
      const stored = await prisma.message.findUniqueOrThrow({
        where: { id: message.id },
      })
      expect(stored.status).toBe("QUEUED")
    })
  })

  describe("campaign completion", () => {
    it("completes a SENDING campaign once every message is done", async () => {
      const { subscriber, campaign } = await seedSendableOrg()
      await createMessage({
        campaignId: campaign.id,
        subscriberId: subscriber.id,
        status: "SENT",
        sentAt: subSeconds(new Date(), 7200),
      })

      await sendMessagesCron()

      const stored = await prisma.campaign.findUniqueOrThrow({
        where: { id: campaign.id },
      })
      expect(stored.status).toBe("COMPLETED")
      expect(stored.completedAt).toBeInstanceOf(Date)
    })

    it("does not complete a campaign that still has a RETRYING message", async () => {
      const { subscriber, campaign } = await seedSendableOrg({
        retryDelay: 300,
      })
      await createMessage({
        campaignId: campaign.id,
        subscriberId: subscriber.id,
        status: "RETRYING",
        tries: 1,
        lastTriedAt: new Date(),
      })

      await sendMessagesCron()

      const stored = await prisma.campaign.findUniqueOrThrow({
        where: { id: campaign.id },
      })
      expect(stored.status).toBe("SENDING")
    })

    it("leaves a DRAFT campaign alone", async () => {
      const { org } = await seedSendableOrg()
      const draft = await createCampaign({
        organizationId: org.id,
        status: "DRAFT",
      })

      await sendMessagesCron()

      const stored = await prisma.campaign.findUniqueOrThrow({
        where: { id: draft.id },
      })
      expect(stored.status).toBe("DRAFT")
    })
  })
})
