import { TRPCError } from "@trpc/server"
import { z } from "zod"
import { Prisma } from "../../prisma/client"
import { authProcedure } from "../trpc"
import { prisma } from "../utils/prisma"
import { paginationSchema } from "../utils/schemas"

export const getLists = authProcedure
  .input(
    z
      .object({
        organizationId: z.string(),
      })
      .merge(paginationSchema)
  )
  .query(async ({ ctx, input }) => {
    // Verify user has access to organization
    const userOrganization = await prisma.userOrganization.findFirst({
      where: {
        userId: ctx.user.id,
        organizationId: input.organizationId,
      },
    })

    if (!userOrganization) {
      throw new TRPCError({
        code: "NOT_FOUND",
        message: "Organization not found",
      })
    }

    const where: Prisma.ListWhereInput = {
      organizationId: input.organizationId,
      ...(input.search
        ? {
            OR: [
              { name: { contains: input.search, mode: "insensitive" } },
              { description: { contains: input.search, mode: "insensitive" } },
            ],
          }
        : {}),
    }

    const [total, lists] = await Promise.all([
      prisma.list.count({ where }),
      prisma.list.findMany({
        where,
        include: {
          _count: {
            select: {
              ListSubscribers: {
                where: {
                  unsubscribedAt: null,
                },
              },
            },
          },
        },
        orderBy: [{ createdAt: "desc" }, { id: "desc" }],
        skip: (input.page - 1) * input.perPage,
        take: input.perPage,
      }),
    ])

    const totalPages = Math.ceil(total / input.perPage)

    return {
      lists,
      pagination: {
        total,
        totalPages,
        page: input.page,
        perPage: input.perPage,
        hasMore: input.page < totalPages,
      },
    }
  })

export const getList = authProcedure
  .input(
    z.object({
      id: z.string(),
    })
  )
  .query(async ({ ctx, input }) => {
    const list = await prisma.list.findUnique({
      where: {
        id: input.id,
      },
      include: {
        Organization: true,
        ListSubscribers: {
          include: {
            Subscriber: true,
          },
        },
      },
    })

    if (!list) {
      throw new TRPCError({
        code: "NOT_FOUND",
        message: "List not found",
      })
    }

    // Verify user has access to organization
    const userOrganization = await prisma.userOrganization.findFirst({
      where: {
        userId: ctx.user.id,
        organizationId: list.organizationId,
      },
    })

    if (!userOrganization) {
      throw new TRPCError({
        code: "UNAUTHORIZED",
        message: "You don't have access to this list",
      })
    }

    return list
  })
