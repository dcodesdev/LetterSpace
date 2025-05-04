import { z } from "zod"
import { authProcedure } from "../trpc"
import { prisma } from "../utils/prisma"
import { TRPCError } from "@trpc/server"
import { paginationSchema } from "../utils/schemas"
import { Prisma } from "../../prisma/client"
import { resolveProps } from "../utils/pProps"

export const listSubscribers = authProcedure
  .input(z.object({ organizationId: z.string() }).merge(paginationSchema))
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

    const where: Prisma.SubscriberWhereInput = {
      organizationId: input.organizationId,
      ...(input.search
        ? {
            OR: [
              { name: { contains: input.search, mode: "insensitive" } },
              { email: { contains: input.search, mode: "insensitive" } },
            ],
          }
        : {}),
    }

    const promises = {
      subscribersList: prisma.subscriber.findMany({
        where,
        orderBy: [{ createdAt: "desc" }, { id: "desc" }],
        skip: (input.page - 1) * input.perPage,
        take: input.perPage,
        include: {
          ListSubscribers: {
            include: {
              List: {
                select: {
                  id: true,
                  name: true,
                },
              },
            },
          },
        },
      }),
      totalItems: prisma.subscriber.count({ where }),
    }

    const result = await resolveProps(promises)

    const totalPages = Math.ceil(result.totalItems / input.perPage)

    return {
      subscribers: result.subscribersList,
      pagination: {
        total: result.totalItems,
        totalPages,
        page: input.page,
        perPage: input.perPage,
        hasMore: input.page < totalPages,
      },
    }
  })

export const getSubscriber = authProcedure
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

    const subscriber = await prisma.subscriber.findFirst({
      where: {
        id: input.id,
        organizationId: input.organizationId,
      },
      include: {
        ListSubscribers: {
          include: {
            List: true,
          },
        },
        Messages: {
          orderBy: [{ createdAt: "desc" }, { id: "desc" }],
          take: 10,
        },
      },
      orderBy: [{ createdAt: "desc" }, { id: "desc" }],
    })

    if (!subscriber) {
      throw new TRPCError({
        code: "NOT_FOUND",
        message: "Subscriber not found",
      })
    }

    return subscriber
  })
