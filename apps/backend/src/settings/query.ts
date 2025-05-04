import { z } from "zod"
import { authProcedure } from "../trpc"
import { prisma } from "../utils/prisma"
import { TRPCError } from "@trpc/server"

export const getSmtp = authProcedure
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

    const settings = await prisma.smtpSettings.findFirst({
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

    return settings
  })

export const getGeneral = authProcedure
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

    const settings = await prisma.generalSettings.findUnique({
      where: {
        organizationId: input.organizationId,
      },
    })

    return settings
  })

export const listApiKeys = authProcedure
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

    const apiKeys = await prisma.apiKey.findMany({
      where: {
        organizationId: input.organizationId,
      },
      select: {
        id: true,
        name: true,
        lastUsed: true,
        expiresAt: true,
        createdAt: true,
      },
      orderBy: [{ createdAt: "desc" }, { id: "desc" }],
    })

    return apiKeys
  })

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

    // TODO: Implement later
    return []
    // const webhooks = await prisma.webhook.findMany({
    //   where: {
    //     organizationId: input.organizationId,
    //   },
    //   orderBy: {
    //     createdAt: "desc",
    //   },
    // })

    // return webhooks
  })

export const getEmailDelivery = authProcedure
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

    const settings = await prisma.emailDeliverySettings.findUnique({
      where: {
        organizationId: input.organizationId,
      },
    })

    return settings
  })
