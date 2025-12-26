import { TRPCError } from "@trpc/server"
import { z } from "zod"
import { Prisma } from "../../prisma/client"
import { authProcedure } from "../trpc"
import { prisma } from "../utils/prisma"
import { paginationSchema } from "../utils/schemas"

const messageStatusEnum = z.enum([
  "QUEUED",
  "PENDING",
  "SENT",
  "AWAITING_WEBHOOK",
  "OPENED",
  "CLICKED",
  "FAILED",
  "RETRYING",
  "CANCELLED",
  "COMPLAINED",
])

export const listMessages = authProcedure
  .input(
    z
      .object({
        organizationId: z.string(),
        campaignId: z.string().optional(),
        subscriberId: z.string().optional(),
        status: messageStatusEnum.optional(),
      })
      .merge(paginationSchema)
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

    const where: Prisma.MessageWhereInput = {
      Campaign: {
        organizationId: input.organizationId,
      },
      ...(input.campaignId ? { campaignId: input.campaignId } : {}),
      ...(input.subscriberId ? { subscriberId: input.subscriberId } : {}),
      ...(input.status ? { status: input.status } : {}),
      ...(input.search
        ? {
            OR: [
              {
                Subscriber: {
                  name: {
                    contains: input.search,
                    mode: "insensitive",
                  },
                },
              },
              {
                Subscriber: {
                  email: {
                    contains: input.search,
                    mode: "insensitive",
                  },
                },
              },
              {
                Campaign: {
                  title: {
                    contains: input.search,
                    mode: "insensitive",
                  },
                },
              },
            ],
          }
        : {}),
    }

    const [total, messages] = await Promise.all([
      prisma.message.count({ where }),
      prisma.message.findMany({
        where,
        orderBy: [{ updatedAt: "desc" }, { id: "desc" }],
        skip: (input.page - 1) * input.perPage,
        take: input.perPage,
        include: {
          Campaign: {
            select: {
              id: true,
              title: true,
            },
          },
          Subscriber: {
            select: {
              id: true,
              email: true,
              name: true,
            },
          },
        },
      }),
    ])

    const totalPages = Math.ceil(total / input.perPage)

    return {
      messages,
      pagination: {
        total,
        totalPages,
        page: input.page,
        perPage: input.perPage,
        hasMore: input.page < totalPages,
      },
    }
  })

export const getMessage = authProcedure
  .input(
    z.object({
      id: z.string(),
    })
  )
  .query(async ({ input }) => {
    const message = await prisma.message.findUnique({
      where: {
        id: input.id,
      },
      include: {
        Campaign: {
          select: {
            id: true,
            title: true,
            content: true,
          },
        },
        Subscriber: {
          select: {
            id: true,
            email: true,
            name: true,
          },
        },
      },
    })

    if (!message) {
      throw new TRPCError({
        code: "NOT_FOUND",
        message: "Message not found",
      })
    }

    return message
  })
