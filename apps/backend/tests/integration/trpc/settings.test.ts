import { faker } from "@faker-js/faker"
import { createApiKey, createUser } from "@helpers/factories"
import { createCaller, expectTrpcError } from "@helpers/trpc"
import { prisma } from "@src/utils/prisma"
import { beforeEach, describe, expect, it, vi } from "vitest"

const mocks = vi.hoisted(() => {
  const sendMail = vi.fn()
  return { sendMail, createTransport: vi.fn(() => ({ sendMail })) }
})

vi.mock("nodemailer", () => ({
  default: { createTransport: mocks.createTransport },
}))

const { sendMail } = mocks

beforeEach(() => {
  vi.clearAllMocks()
  sendMail.mockResolvedValue({
    accepted: ["to@example.com"],
    rejected: [],
    messageId: "<test-id@test>",
  })
})

const smtpInput = (organizationId: string) => ({
  organizationId,
  host: "smtp.example.com",
  port: 2525,
  username: "mailer",
  password: "secret",
  fromEmail: "hello@example.com",
  fromName: "Example",
  secure: false,
  encryption: "STARTTLS" as const,
})

const deliveryInput = (organizationId: string) => ({
  organizationId,
  rateLimit: 50,
  rateWindow: 60,
  maxRetries: 0,
  retryDelay: 10,
  concurrency: 2,
  connectionTimeout: 5000,
})

describe("trpc settings router", () => {
  describe("smtp", () => {
    it("returns the organization's smtp settings", async () => {
      const { user, orgId } = await createUser()

      const settings = await createCaller({ id: user.id }).settings.getSmtp({
        organizationId: orgId,
      })

      expect(settings).toMatchObject({
        host: "smtp.test.com",
        port: 587,
        encryption: "STARTTLS",
      })
    })

    it("returns null when the organization has no smtp settings", async () => {
      const { user, orgId } = await createUser()
      await prisma.smtpSettings.deleteMany({ where: { organizationId: orgId } })

      const settings = await createCaller({ id: user.id }).settings.getSmtp({
        organizationId: orgId,
      })

      expect(settings).toBeNull()
    })

    it("creates settings when none exist", async () => {
      const { user, orgId } = await createUser()
      await prisma.smtpSettings.deleteMany({ where: { organizationId: orgId } })

      const { settings } = await createCaller({
        id: user.id,
      }).settings.updateSmtp(smtpInput(orgId))

      expect(settings).toMatchObject({
        organizationId: orgId,
        host: "smtp.example.com",
        port: 2525,
        fromEmail: "hello@example.com",
      })

      const stored = await prisma.smtpSettings.findMany({
        where: { organizationId: orgId },
      })
      expect(stored).toHaveLength(1)
    })

    it("updates the existing settings row in place", async () => {
      const { user, orgId } = await createUser()
      const existing = await prisma.smtpSettings.findFirstOrThrow({
        where: { organizationId: orgId },
      })

      const { settings } = await createCaller({
        id: user.id,
      }).settings.updateSmtp({ ...smtpInput(orgId), encryption: "SSL_TLS" })

      expect(settings.id).toBe(existing.id)
      expect(settings.encryption).toBe("SSL_TLS")

      const stored = await prisma.smtpSettings.findMany({
        where: { organizationId: orgId },
      })
      expect(stored).toHaveLength(1)
    })

    it.each([
      ["an empty host", { host: "" }],
      ["a zero port", { port: 0 }],
      ["an invalid fromEmail", { fromEmail: "not-an-email" }],
      ["an unknown encryption", { encryption: "PLAIN" as never }],
    ])("rejects %s", async (_label, patch) => {
      const { user, orgId } = await createUser()

      await expectTrpcError(
        createCaller({ id: user.id }).settings.updateSmtp({
          ...smtpInput(orgId),
          ...patch,
        }),
        "BAD_REQUEST"
      )
    })

    it("rejects reading or writing another organization's settings", async () => {
      const { user } = await createUser()
      const other = await createUser()

      await expectTrpcError(
        createCaller({ id: user.id }).settings.getSmtp({
          organizationId: other.orgId,
        }),
        "UNAUTHORIZED"
      )

      await expectTrpcError(
        createCaller({ id: user.id }).settings.updateSmtp(
          smtpInput(other.orgId)
        ),
        "UNAUTHORIZED"
      )
    })
  })

  describe("testSmtp", () => {
    it("sends a test email through the organization's smtp settings", async () => {
      const { user, orgId } = await createUser()

      const result = await createCaller({ id: user.id }).settings.testSmtp({
        email: "to@example.com",
        organizationId: orgId,
      })

      expect(result).toEqual({ success: true })
      expect(mocks.createTransport).toHaveBeenCalledWith(
        expect.objectContaining({ host: "smtp.test.com", port: 587 })
      )
      expect(sendMail).toHaveBeenCalledTimes(1)
      expect(sendMail).toHaveBeenCalledWith(
        expect.objectContaining({
          to: ["to@example.com"],
          subject: "SMTP Configuration Test",
        })
      )
    })

    it("fails with INTERNAL_SERVER_ERROR when the recipient is rejected", async () => {
      const { user, orgId } = await createUser()
      sendMail.mockResolvedValue({
        accepted: [],
        rejected: ["to@example.com"],
        messageId: "<test-id@test>",
      })

      await expect(
        createCaller({ id: user.id }).settings.testSmtp({
          email: "to@example.com",
          organizationId: orgId,
        })
      ).rejects.toMatchObject({
        code: "INTERNAL_SERVER_ERROR",
        message: "Failed to send test email",
      })
    })

    it("surfaces a transport failure as INTERNAL_SERVER_ERROR", async () => {
      const { user, orgId } = await createUser()
      sendMail.mockRejectedValue(new Error("connect ECONNREFUSED"))

      await expect(
        createCaller({ id: user.id }).settings.testSmtp({
          email: "to@example.com",
          organizationId: orgId,
        })
      ).rejects.toMatchObject({
        code: "INTERNAL_SERVER_ERROR",
        message: "connect ECONNREFUSED",
      })
    })

    it("rejects with BAD_REQUEST when no smtp settings exist", async () => {
      const { user, orgId } = await createUser()
      await prisma.smtpSettings.deleteMany({ where: { organizationId: orgId } })

      await expectTrpcError(
        createCaller({ id: user.id }).settings.testSmtp({
          email: "to@example.com",
          organizationId: orgId,
        }),
        "BAD_REQUEST"
      )
      expect(sendMail).not.toHaveBeenCalled()
    })

    it("rejects a non-member without sending", async () => {
      const { user } = await createUser()
      const other = await createUser()

      await expectTrpcError(
        createCaller({ id: user.id }).settings.testSmtp({
          email: "to@example.com",
          organizationId: other.orgId,
        }),
        "UNAUTHORIZED"
      )
      expect(sendMail).not.toHaveBeenCalled()
    })

    it("rejects without a user", async () => {
      await expectTrpcError(
        createCaller().settings.testSmtp({
          email: "to@example.com",
          organizationId: faker.string.uuid(),
        }),
        "UNAUTHORIZED"
      )
    })
  })

  describe("general", () => {
    it("returns the defaults created with the organization", async () => {
      const { user, orgId } = await createUser()

      const settings = await createCaller({ id: user.id }).settings.getGeneral({
        organizationId: orgId,
      })

      expect(settings).toMatchObject({
        organizationId: orgId,
        cleanupInterval: 90,
        defaultFromEmail: null,
      })
    })

    it("updates the general settings", async () => {
      const { user, orgId } = await createUser()

      const { settings } = await createCaller({
        id: user.id,
      }).settings.updateGeneral({
        organizationId: orgId,
        defaultFromEmail: "news@example.com",
        defaultFromName: "Example News",
        baseURL: "https://example.com",
        cleanupInterval: 30,
      })

      expect(settings).toMatchObject({
        defaultFromEmail: "news@example.com",
        defaultFromName: "Example News",
        baseURL: "https://example.com",
        cleanupInterval: 30,
      })
    })

    it("creates the row when the organization has none", async () => {
      const { user, orgId } = await createUser()
      await prisma.generalSettings.deleteMany({
        where: { organizationId: orgId },
      })

      const { settings } = await createCaller({
        id: user.id,
      }).settings.updateGeneral({
        organizationId: orgId,
        baseURL: "https://created.example.com",
      })

      expect(settings.baseURL).toBe("https://created.example.com")
    })

    it("accepts empty strings for the optional email and url", async () => {
      const { user, orgId } = await createUser()

      const { settings } = await createCaller({
        id: user.id,
      }).settings.updateGeneral({
        organizationId: orgId,
        defaultFromEmail: "",
        baseURL: "",
      })

      expect(settings.defaultFromEmail).toBe("")
      expect(settings.baseURL).toBe("")
    })

    it.each([
      ["an invalid defaultFromEmail", { defaultFromEmail: "nope" }],
      ["an invalid baseURL", { baseURL: "not-a-url" }],
      ["a zero cleanupInterval", { cleanupInterval: 0 }],
    ])("rejects %s", async (_label, patch) => {
      const { user, orgId } = await createUser()

      await expectTrpcError(
        createCaller({ id: user.id }).settings.updateGeneral({
          organizationId: orgId,
          ...patch,
        }),
        "BAD_REQUEST"
      )
    })

    it("rejects reading or writing another organization's settings", async () => {
      const { user } = await createUser()
      const other = await createUser()

      await expectTrpcError(
        createCaller({ id: user.id }).settings.getGeneral({
          organizationId: other.orgId,
        }),
        "UNAUTHORIZED"
      )

      await expectTrpcError(
        createCaller({ id: user.id }).settings.updateGeneral({
          organizationId: other.orgId,
          defaultFromName: "Hijacked",
        }),
        "UNAUTHORIZED"
      )
    })
  })

  describe("email delivery", () => {
    it("returns the defaults created with the organization", async () => {
      const { user, orgId } = await createUser()

      const settings = await createCaller({
        id: user.id,
      }).settings.getEmailDelivery({ organizationId: orgId })

      expect(settings).toMatchObject({
        organizationId: orgId,
        rateLimit: 100,
        rateWindow: 3600,
        maxRetries: 3,
      })
    })

    it("updates the delivery settings", async () => {
      const { user, orgId } = await createUser()

      const { settings } = await createCaller({
        id: user.id,
      }).settings.updateEmailDelivery(deliveryInput(orgId))

      expect(settings).toMatchObject({
        rateLimit: 50,
        rateWindow: 60,
        maxRetries: 0,
        retryDelay: 10,
        concurrency: 2,
        connectionTimeout: 5000,
      })
    })

    it("creates the row when the organization has none", async () => {
      const { user, orgId } = await createUser()
      await prisma.emailDeliverySettings.deleteMany({
        where: { organizationId: orgId },
      })

      const { settings } = await createCaller({
        id: user.id,
      }).settings.updateEmailDelivery(deliveryInput(orgId))

      expect(settings.organizationId).toBe(orgId)
    })

    it.each([
      ["a zero rate limit", { rateLimit: 0 }],
      ["a zero rate window", { rateWindow: 0 }],
      ["a negative retry count", { maxRetries: -1 }],
      ["a zero concurrency", { concurrency: 0 }],
      ["a zero connection timeout", { connectionTimeout: 0 }],
    ])("rejects %s", async (_label, patch) => {
      const { user, orgId } = await createUser()

      await expectTrpcError(
        createCaller({ id: user.id }).settings.updateEmailDelivery({
          ...deliveryInput(orgId),
          ...patch,
        }),
        "BAD_REQUEST"
      )
    })

    it("rejects reading or writing another organization's settings", async () => {
      const { user } = await createUser()
      const other = await createUser()

      await expectTrpcError(
        createCaller({ id: user.id }).settings.getEmailDelivery({
          organizationId: other.orgId,
        }),
        "UNAUTHORIZED"
      )

      await expectTrpcError(
        createCaller({ id: user.id }).settings.updateEmailDelivery(
          deliveryInput(other.orgId)
        ),
        "UNAUTHORIZED"
      )
    })
  })

  describe("api keys", () => {
    it("creates a key with the sk_ prefix and stores it", async () => {
      const { user, orgId } = await createUser()

      const created = await createCaller({
        id: user.id,
      }).settings.createApiKey({ organizationId: orgId, name: "CI" })

      expect(created.key).toMatch(/^sk_[0-9a-f]{64}$/)

      const stored = await prisma.apiKey.findUniqueOrThrow({
        where: { id: created.id },
        omit: { key: false },
      })
      expect(stored.key).toBe(created.key)
      expect(stored.name).toBe("CI")
      expect(stored.expiresAt).toBeNull()
    })

    it("stores an expiry when given one", async () => {
      const { user, orgId } = await createUser()
      const expiresAt = new Date("2030-01-01T00:00:00.000Z")

      const created = await createCaller({
        id: user.id,
      }).settings.createApiKey({
        organizationId: orgId,
        name: "Expiring",
        expiresAt: expiresAt.toISOString(),
      })

      const stored = await prisma.apiKey.findUniqueOrThrow({
        where: { id: created.id },
      })
      expect(stored.expiresAt).toEqual(expiresAt)
    })

    it("lists the organization's keys without exposing the secret", async () => {
      const { user, orgId } = await createUser()
      await createApiKey({ organizationId: orgId, name: "Second" })

      const keys = await createCaller({ id: user.id }).settings.listApiKeys({
        organizationId: orgId,
      })

      expect(keys).toHaveLength(2)
      expect(keys.map((key) => key.name)).toContain("Second")
      keys.forEach((key) => expect(key).not.toHaveProperty("key"))
    })

    it("does not list another organization's keys", async () => {
      const { user, orgId } = await createUser()
      const other = await createUser()

      const keys = await createCaller({ id: user.id }).settings.listApiKeys({
        organizationId: orgId,
      })

      expect(keys.map((key) => key.id)).not.toContain(other.apiKey.id)
    })

    it("deletes a key", async () => {
      const { user, orgId, apiKey } = await createUser()

      const result = await createCaller({
        id: user.id,
      }).settings.deleteApiKey({ organizationId: orgId, id: apiKey.id })

      expect(result.success).toBe(true)
      expect(
        await prisma.apiKey.findUnique({ where: { id: apiKey.id } })
      ).toBeNull()
    })

    it("cannot delete a key belonging to another organization", async () => {
      const { user, orgId } = await createUser()
      const other = await createUser()

      await expectTrpcError(
        createCaller({ id: user.id }).settings.deleteApiKey({
          organizationId: orgId,
          id: other.apiKey.id,
        }),
        "NOT_FOUND"
      )

      expect(
        await prisma.apiKey.findUnique({ where: { id: other.apiKey.id } })
      ).not.toBeNull()
    })

    it("rejects api key operations for another organization", async () => {
      const { user } = await createUser()
      const other = await createUser()

      await expectTrpcError(
        createCaller({ id: user.id }).settings.listApiKeys({
          organizationId: other.orgId,
        }),
        "UNAUTHORIZED"
      )

      await expectTrpcError(
        createCaller({ id: user.id }).settings.createApiKey({
          organizationId: other.orgId,
          name: "Hijacked",
        }),
        "UNAUTHORIZED"
      )

      await expectTrpcError(
        createCaller({ id: user.id }).settings.deleteApiKey({
          organizationId: other.orgId,
          id: other.apiKey.id,
        }),
        "UNAUTHORIZED"
      )
    })
  })

  describe("authentication", () => {
    it.each([
      "getSmtp",
      "getGeneral",
      "getEmailDelivery",
      "listApiKeys",
      "listWebhooks",
    ] as const)("rejects %s without a user", async (procedure) => {
      await expectTrpcError(
        createCaller().settings[procedure]({
          organizationId: faker.string.uuid(),
        }),
        "UNAUTHORIZED"
      )
    })

    it("rejects updateSmtp without a user", async () => {
      await expectTrpcError(
        createCaller().settings.updateSmtp(smtpInput(faker.string.uuid())),
        "UNAUTHORIZED"
      )
    })

    it("rejects updateEmailDelivery without a user", async () => {
      await expectTrpcError(
        createCaller().settings.updateEmailDelivery(
          deliveryInput(faker.string.uuid())
        ),
        "UNAUTHORIZED"
      )
    })

    it("rejects updateGeneral without a user", async () => {
      await expectTrpcError(
        createCaller().settings.updateGeneral({
          organizationId: faker.string.uuid(),
        }),
        "UNAUTHORIZED"
      )
    })
  })
})
