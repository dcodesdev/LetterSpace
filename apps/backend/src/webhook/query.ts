import { TRPCError } from "@trpc/server"
import { z } from "zod"
import { authProcedure } from "../trpc"
import { prisma } from "../utils/prisma"

export const listWebhooks = authProcedure
  .input(
    z.object({
      organizationId: z.string(),
    })
  )
  .query(async ({ ctx, input }) => {
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

    const webhooks = await prisma.webhook.findMany({
      where: {
        organizationId: input.organizationId,
      },
      orderBy: {
        createdAt: "desc",
      },
    })

    return webhooks
  })

export const getWebhook = authProcedure
  .input(
    z.object({
      id: z.string(),
      organizationId: z.string(),
    })
  )
  .query(async ({ ctx, input }) => {
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

    const webhook = await prisma.webhook.findFirst({
      where: {
        id: input.id,
        organizationId: input.organizationId,
      },
    })

    if (!webhook) {
      throw new TRPCError({
        code: "NOT_FOUND",
        message: "Webhook not found",
      })
    }

    return webhook
  })

export const getWebhookLogs = authProcedure
  .input(
    z.object({
      webhookId: z.string(),
      organizationId: z.string(),
      limit: z.number().min(1).max(100).default(50),
      cursor: z.string().optional(),
    })
  )
  .query(async ({ ctx, input }) => {
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

    const logs = await prisma.webhookLog.findMany({
      where: {
        webhookId: input.webhookId,
        Webhook: {
          organizationId: input.organizationId,
        },
      },
      take: input.limit + 1,
      cursor: input.cursor ? { id: input.cursor } : undefined,
      orderBy: {
        createdAt: "desc",
      },
    })

    let nextCursor: typeof input.cursor | undefined = undefined
    if (logs.length > input.limit) {
      const nextItem = logs.pop()
      nextCursor = nextItem!.id
    }

    return {
      items: logs,
      nextCursor,
    }
  })
