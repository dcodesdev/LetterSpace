import type { SmtpSettings } from "@prisma-client"
import { beforeEach, describe, expect, it, vi } from "vitest"
import { Mailer } from "./Mailer"

const mocks = vi.hoisted(() => {
  const sendMail = vi.fn()
  return {
    sendMail,
    createTransport: vi.fn((_options: unknown) => ({ sendMail })),
  }
})

vi.mock("nodemailer", () => ({
  default: { createTransport: mocks.createTransport },
}))

const { sendMail, createTransport } = mocks

const smtpSettings = (overrides: Partial<SmtpSettings> = {}): SmtpSettings =>
  ({
    id: "smtp-1",
    host: "smtp.test.com",
    port: 587,
    username: "user",
    password: "pass",
    fromEmail: "from@test.com",
    fromName: "From",
    secure: true,
    encryption: "STARTTLS",
    timeout: 30000,
    organizationId: "org-1",
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  }) as SmtpSettings

const smtpResponse = (overrides: Record<string, unknown> = {}) => ({
  accepted: ["to@test.com"],
  rejected: [],
  ehlo: [],
  envelopeTime: 1,
  messageTime: 1,
  messageSize: 1,
  response: "250 OK",
  envelope: { from: "from@test.com", to: ["to@test.com"] },
  messageId: "<abc123@smtp.test.com>",
  ...overrides,
})

const options = {
  from: "From <from@test.com>",
  to: "to@test.com",
  subject: "Subject",
  html: "<p>Hello</p>",
  text: "Hello",
}

describe("Mailer", () => {
  beforeEach(() => {
    sendMail.mockReset()
    createTransport.mockClear()
  })

  describe("transport configuration", () => {
    it("passes host, auth and timeout from the smtp settings", () => {
      new Mailer(smtpSettings({ host: "mail.example.com", timeout: 1234 }))

      expect(createTransport).toHaveBeenCalledTimes(1)
      expect(createTransport.mock.calls[0]?.[0]).toMatchObject({
        host: "mail.example.com",
        connectionTimeout: 1234,
        auth: { user: "user", pass: "pass" },
      })
    })

    it("requires TLS upgrade for STARTTLS", () => {
      new Mailer(smtpSettings({ encryption: "STARTTLS", port: 2525 }))

      expect(createTransport.mock.calls[0]?.[0]).toMatchObject({
        port: 2525,
        secure: false,
        requireTLS: true,
      })
    })

    it("defaults STARTTLS to port 587 when the port is falsy", () => {
      new Mailer(smtpSettings({ encryption: "STARTTLS", port: 0 }))

      expect(createTransport.mock.calls[0]?.[0]).toMatchObject({ port: 587 })
    })

    it("uses a direct TLS connection for SSL_TLS", () => {
      new Mailer(smtpSettings({ encryption: "SSL_TLS", port: 0 }))

      expect(createTransport.mock.calls[0]?.[0]).toMatchObject({
        port: 465,
        secure: true,
      })
    })

    it("ignores TLS for NONE", () => {
      new Mailer(smtpSettings({ encryption: "NONE", port: 0 }))

      expect(createTransport.mock.calls[0]?.[0]).toMatchObject({
        port: 25,
        secure: false,
        requireTLS: false,
        ignoreTLS: true,
      })
    })
  })

  describe("sendEmail", () => {
    it("returns success and a bracket-stripped message id when accepted", async () => {
      sendMail.mockResolvedValue(smtpResponse())

      const result = await new Mailer(smtpSettings()).sendEmail(options)

      expect(result).toEqual({
        success: true,
        from: options.from,
        messageId: "abc123@smtp.test.com",
      })
    })

    it("forwards the mail options to nodemailer", async () => {
      sendMail.mockResolvedValue(smtpResponse())

      await new Mailer(smtpSettings()).sendEmail(options)

      expect(sendMail).toHaveBeenCalledWith({
        to: ["to@test.com"],
        subject: "Subject",
        from: options.from,
        text: "Hello",
        html: "<p>Hello</p>",
      })
    })

    it("sends undefined instead of null for missing html and text", async () => {
      sendMail.mockResolvedValue(smtpResponse())

      await new Mailer(smtpSettings()).sendEmail({
        ...options,
        html: null,
        text: null,
      })

      expect(sendMail.mock.calls[0]?.[0]).toMatchObject({
        text: undefined,
        html: undefined,
      })
    })

    it("returns success: false when the recipient is rejected", async () => {
      sendMail.mockResolvedValue(
        smtpResponse({ accepted: [], rejected: ["to@test.com"] })
      )

      const result = await new Mailer(smtpSettings()).sendEmail(options)

      expect(result.success).toBe(false)
      expect(result.messageId).toBe("abc123@smtp.test.com")
    })

    it("returns success: false when nothing is accepted or rejected", async () => {
      sendMail.mockResolvedValue(smtpResponse({ accepted: [], rejected: [] }))

      const result = await new Mailer(smtpSettings()).sendEmail(options)

      expect(result.success).toBe(false)
    })

    it("omits the message id when the response has none", async () => {
      sendMail.mockResolvedValue(smtpResponse({ messageId: "" }))

      const result = await new Mailer(smtpSettings()).sendEmail(options)

      expect(result.messageId).toBeUndefined()
    })

    it("propagates a send failure to the caller", async () => {
      sendMail.mockRejectedValue(new Error("Connection refused"))

      await expect(
        new Mailer(smtpSettings()).sendEmail(options)
      ).rejects.toThrow("Connection refused")
    })
  })
})
