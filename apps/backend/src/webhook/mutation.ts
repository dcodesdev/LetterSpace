import { TRPCError } from "@trpc/server"
import { z } from "zod"
import { authProcedure } from "../trpc"
import { prisma } from "../utils/prisma"

const webhookSchema = z.object({
  name: z.string().min(1, "Name is required"),
  isActive: z.boolean().default(true),
  authCode: z.string().optional(),
  transformCode: z.string().optional(),
})

export const createWebhook = authProcedure
  .input(
    z.object({
      organizationId: z.string(),
      ...webhookSchema.shape,
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

    const webhook = await prisma.webhook.create({
      data: {
        name: input.name,
        isActive: input.isActive,
        authCode: input.authCode,
        transformCode: input.transformCode,
        organizationId: input.organizationId,
      },
    })

    return { webhook }
  })

export const updateWebhook = authProcedure
  .input(
    z.object({
      id: z.string(),
      organizationId: z.string(),
      ...webhookSchema.partial().shape,
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

    const existingWebhook = await prisma.webhook.findFirst({
      where: {
        id: input.id,
        organizationId: input.organizationId,
      },
    })

    if (!existingWebhook) {
      throw new TRPCError({
        code: "NOT_FOUND",
        message: "Webhook not found",
      })
    }

    const webhook = await prisma.webhook.update({
      where: { id: input.id },
      data: {
        name: input.name,
        isActive: input.isActive,
        authCode: input.authCode,
        transformCode: input.transformCode,
      },
    })

    return { webhook }
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

    const existingWebhook = await prisma.webhook.findFirst({
      where: {
        id: input.id,
        organizationId: input.organizationId,
      },
    })

    if (!existingWebhook) {
      throw new TRPCError({
        code: "NOT_FOUND",
        message: "Webhook not found",
      })
    }

    await prisma.webhook.delete({
      where: { id: input.id },
    })

    return { success: true }
  })
