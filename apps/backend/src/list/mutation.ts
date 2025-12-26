import { TRPCError } from "@trpc/server"
import { z } from "zod"
import { authProcedure } from "../trpc"
import { prisma } from "../utils/prisma"

const createListSchema = z.object({
  name: z.string().min(1, "List name is required"),
  description: z.string().optional(),
  organizationId: z.string(),
})

export const createList = authProcedure
  .input(createListSchema)
  .mutation(async ({ ctx, input }) => {
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

    const list = await prisma.list.create({
      data: {
        name: input.name,
        description: input.description,
        organizationId: input.organizationId,
      },
      select: {
        id: true,
        name: true,
        description: true,
        createdAt: true,
      },
    })

    return {
      list,
    }
  })

const updateListSchema = z.object({
  id: z.string(),
  name: z.string().min(1, "List name is required"),
  description: z.string().optional(),
})

export const updateList = authProcedure
  .input(updateListSchema)
  .mutation(async ({ ctx, input }) => {
    const list = await prisma.list.findUnique({
      where: {
        id: input.id,
      },
      include: {
        Organization: true,
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

    const updatedList = await prisma.list.update({
      where: {
        id: input.id,
      },
      data: {
        name: input.name,
        description: input.description,
      },
      select: {
        id: true,
        name: true,
        description: true,
        createdAt: true,
        updatedAt: true,
      },
    })

    return {
      list: updatedList,
    }
  })

export const deleteList = authProcedure
  .input(z.object({ id: z.string() }))
  .mutation(async ({ ctx, input }) => {
    const list = await prisma.list.findUnique({
      where: {
        id: input.id,
      },
      include: {
        Organization: true,
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

    await prisma.list.delete({
      where: {
        id: input.id,
      },
    })

    return { success: true }
  })
