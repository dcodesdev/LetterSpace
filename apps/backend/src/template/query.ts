import { z } from "zod"
import { authProcedure } from "../trpc"
import { prisma } from "../utils/prisma"
import { TRPCError } from "@trpc/server"
import { paginationSchema } from "../utils/schemas"
import { Prisma } from "../../prisma/client"

export const listTemplates = authProcedure
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

    const where: Prisma.TemplateWhereInput = {
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

    const [total, templates] = await Promise.all([
      prisma.template.count({ where }),
      prisma.template.findMany({
        where,
        orderBy: [{ createdAt: "desc" }, { id: "desc" }],
        skip: (input.page - 1) * input.perPage,
        take: input.perPage,
      }),
    ])

    const totalPages = Math.ceil(total / input.perPage)

    return {
      templates,
      pagination: {
        total,
        totalPages,
        page: input.page,
        perPage: input.perPage,
        hasMore: input.page < totalPages,
      },
    }
  })

export const getTemplate = authProcedure
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

    const template = await prisma.template.findFirst({
      where: {
        id: input.id,
        organizationId: input.organizationId,
      },
    })

    if (!template) {
      throw new TRPCError({
        code: "NOT_FOUND",
        message: "Template not found",
      })
    }

    return template
  })
