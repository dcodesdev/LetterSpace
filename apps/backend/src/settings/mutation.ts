import { z } from "zod"
import { authProcedure } from "../trpc"
import { prisma } from "../utils/prisma"
import { TRPCError } from "@trpc/server"
import { randomBytes } from "crypto"
import { Mailer } from "../lib/Mailer"

const smtpSchema = z.object({
  organizationId: z.string(),
  host: z.string().min(1, "SMTP host is required"),
  port: z.number().min(1, "Port is required"),
  username: z.string().min(1, "Username is required"),
  password: z.string().min(1, "Password is required"),
  fromEmail: z.string().email("Invalid email address").optional(),
  fromName: z.string().optional(),
  secure: z.boolean(),
  encryption: z.enum(["STARTTLS", "SSL_TLS", "NONE"]),
})

export const updateSmtp = authProcedure
  .input(smtpSchema)
  .mutation(async ({ ctx, input }) => {
    const userOrganization = await prisma.userOrganization.findFirst({
      where: {
        userId: ctx.user.id,
        organizationId: input.organizationId,
      },
    })

    if (!userOrganization) {
      throw new TRPCError({
        code: "UNAUTHORIZED",
        message: "Organization not found",
      })
    }

    const smtpSettings = await prisma.smtpSettings.findFirst({
      where: {
        Organization: {
          id: input.organizationId,
          UserOrganizations: {
            some: {
              userId: ctx.user.id,
            },
          },
        },
      },
    })

    const settings = await prisma.smtpSettings.upsert({
      where: {
        id: smtpSettings ? smtpSettings.id : "create-happens",
      },
      create: {
        host: input.host,
        port: input.port,
        username: input.username,
        password: input.password,
        fromEmail: input.fromEmail,
        fromName: input.fromName,
        secure: input.secure,
        encryption: input.encryption,
        organizationId: input.organizationId,
      },
      update: {
        host: input.host,
        port: input.port,
        username: input.username,
        password: input.password,
        fromEmail: input.fromEmail,
        fromName: input.fromName,
        secure: input.secure,
        encryption: input.encryption,
      },
    })

    return { settings }
  })

const emailDeliverySchema = z.object({
  organizationId: z.string(),
  rateLimit: z.number().min(1, "Rate limit is required"),
  rateWindow: z.number().min(1, "Rate window is required"),
  maxRetries: z.number().min(0, "Max retries must be 0 or greater"),
  retryDelay: z.number().min(1, "Retry delay is required"),
  concurrency: z.number().min(1, "Concurrency must be at least 1"),
  connectionTimeout: z.number().min(1, "Connection timeout must be at least 1"),
})

export const updateEmailDelivery = authProcedure
  .input(emailDeliverySchema)
  .mutation(async ({ ctx, input }) => {
    const userOrganization = await prisma.userOrganization.findFirst({
      where: {
        userId: ctx.user.id,
        organizationId: input.organizationId,
      },
    })

    if (!userOrganization) {
      throw new TRPCError({
        code: "UNAUTHORIZED",
        message: "Organization not found",
      })
    }

    const settings = await prisma.emailDeliverySettings.upsert({
      where: {
        organizationId: input.organizationId,
      },
      create: {
        rateLimit: input.rateLimit,
        rateWindow: input.rateWindow,
        maxRetries: input.maxRetries,
        retryDelay: input.retryDelay,
        concurrency: input.concurrency,
        connectionTimeout: input.connectionTimeout,
        organizationId: input.organizationId,
      },
      update: {
        rateLimit: input.rateLimit,
        rateWindow: input.rateWindow,
        maxRetries: input.maxRetries,
        retryDelay: input.retryDelay,
        concurrency: input.concurrency,
        connectionTimeout: input.connectionTimeout,
      },
    })

    return { settings }
  })

const generalSettingsSchema = z.object({
  organizationId: z.string(),
  defaultFromEmail: z.string().email().optional().or(z.literal("")),
  defaultFromName: z.string().optional(),
  baseURL: z.string().url().optional().or(z.literal("")),
})

export const updateGeneral = authProcedure
  .input(generalSettingsSchema)
  .mutation(async ({ ctx, input }) => {
    const userOrganization = await prisma.userOrganization.findFirst({
      where: {
        userId: ctx.user.id,
        organizationId: input.organizationId,
      },
    })

    if (!userOrganization) {
      throw new TRPCError({
        code: "UNAUTHORIZED",
        message: "Organization not found",
      })
    }

    const settings = await prisma.generalSettings.upsert({
      where: {
        organizationId: input.organizationId,
      },
      create: {
        defaultFromEmail: input.defaultFromEmail,
        defaultFromName: input.defaultFromName,
        baseURL: input.baseURL,
        organizationId: input.organizationId,
      },
      update: {
        defaultFromEmail: input.defaultFromEmail,
        defaultFromName: input.defaultFromName,
        baseURL: input.baseURL,
      },
    })

    return { settings }
  })

const createApiKeySchema = z.object({
  organizationId: z.string(),
  name: z.string().min(1, "Name is required"),
  expiresAt: z.string().optional(),
})

export const createApiKey = authProcedure
  .input(createApiKeySchema)
  .mutation(async ({ ctx, input }) => {
    const userOrganization = await prisma.userOrganization.findFirst({
      where: {
        userId: ctx.user.id,
        organizationId: input.organizationId,
      },
    })

    if (!userOrganization) {
      throw new TRPCError({
        code: "UNAUTHORIZED",
        message: "Organization not found",
      })
    }

    let key = `sk_${randomBytes(32).toString("hex")}`

    while (await prisma.apiKey.findUnique({ where: { key } })) {
      key = `sk_${randomBytes(32).toString("hex")}`
    }

    const apiKey = await prisma.apiKey.create({
      data: {
        name: input.name,
        key: key,
        expiresAt: input.expiresAt ? new Date(input.expiresAt) : null,
        organizationId: input.organizationId,
      },
      select: {
        id: true,
        key: true,
      },
    })

    return apiKey
  })

const deleteApiKeySchema = z.object({
  organizationId: z.string(),
  id: z.string(),
})

export const deleteApiKey = authProcedure
  .input(deleteApiKeySchema)
  .mutation(async ({ ctx, input }) => {
    const userOrganization = await prisma.userOrganization.findFirst({
      where: {
        userId: ctx.user.id,
        organizationId: input.organizationId,
      },
    })

    if (!userOrganization) {
      throw new TRPCError({
        code: "UNAUTHORIZED",
        message: "Organization not found",
      })
    }

    await prisma.apiKey.delete({
      where: {
        id: input.id,
        organizationId: input.organizationId,
      },
    })

    return { success: true }
  })

const createWebhookSchema = z.object({
  organizationId: z.string(),
  name: z.string().min(1, "Name is required"),
  url: z.string().url("Must be a valid URL"),
  events: z.array(z.string()).min(1, "At least one event must be selected"),
  isActive: z.boolean(),
  secret: z.string().min(1, "Secret is required"),
})

export const createWebhook = authProcedure
  .input(createWebhookSchema)
  .mutation(async ({ ctx, input }) => {
    const userOrganization = await prisma.userOrganization.findFirst({
      where: {
        userId: ctx.user.id,
        organizationId: input.organizationId,
      },
    })

    if (!userOrganization) {
      throw new TRPCError({
        code: "UNAUTHORIZED",
        message: "Organization not found",
      })
    }

    // const webhook = await prisma.webhook.create({
    //   data: {
    //     name: input.name,
    //     url: input.url,
    //     events: input.events,
    //     isActive: input.isActive,
    //     secret: input.secret,
    //     organizationId: input.organizationId,
    //   },
    // })

    // TODO: Implement webhook creation
    return { webhook: null }
  })

export const deleteWebhook = authProcedure
  .input(
    z.object({
      id: z.string(),
      organizationId: z.string(),
    })
  )
  .mutation(async ({ ctx, input }) => {
    const userOrganization = await prisma.userOrganization.findFirst({
      where: {
        userId: ctx.user.id,
        organizationId: input.organizationId,
      },
    })

    if (!userOrganization) {
      throw new TRPCError({
        code: "UNAUTHORIZED",
        message: "Organization not found",
      })
    }

    // TODO: Implement webhook deletion
    return { success: true }
  })

export const testSmtp = authProcedure
  .input(
    z.object({
      email: z.string().email(),
      organizationId: z.string(),
    })
  )
  .mutation(async ({ input }) => {
    const settings = await prisma.smtpSettings.findFirst({
      where: {
        organizationId: input.organizationId,
      },
    })

    if (!settings) {
      throw new TRPCError({
        code: "BAD_REQUEST",
        message:
          "SMTP settings not found. Please configure your SMTP settings first.",
      })
    }

    const APP_NAME = "LetterSpace"

    const testTemplate = `
      <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <h1 style="color: #1a1a1a; margin-bottom: 20px;">SMTP Test Email</h1>
        <p style="color: #4a4a4a; line-height: 1.5;">
          This is a test email to verify your SMTP configuration. If you're reading this, your SMTP settings are working correctly! 🎉
        </p>
        <div style="margin-top: 30px; padding: 15px; background-color: #f5f5f5; border-radius: 5px;">
          <p style="color: #666; margin: 0;">
            Sent from ${APP_NAME}
          </p>
        </div>
      </div>
    `

    const mailer = new Mailer(settings)

    const result = await mailer.sendEmail({
      to: input.email,
      subject: "SMTP Configuration Test",
      html: testTemplate,
      from: `${settings.fromName} <${settings.fromEmail}>`,
    })

    if (!result.success) {
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: "Failed to send test email",
      })
    }

    return { success: true }
  })
