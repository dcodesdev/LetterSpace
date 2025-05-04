import { z } from "zod"
import { authProcedure } from "../trpc"
import { prisma } from "../utils/prisma"
import { TRPCError } from "@trpc/server"

const contentSchema = z
  .string()
  .min(1, "HTML content is required")
  .refine(
    (content) => content.includes("{{CONTENT}}"),
    "Content must include the {{CONTENT}} placeholder"
  )

const createTemplateSchema = z.object({
  name: z.string().min(1, "Template name is required"),
  description: z.string().nullable().optional(),
  content: contentSchema,
  organizationId: z.string(),
})

export const createTemplate = authProcedure
  .input(createTemplateSchema)
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

    const template = await prisma.template.create({
      data: {
        name: input.name,
        description: input.description,
        content: input.content,
        organizationId: input.organizationId,
      },
    })

    return { template }
  })

export const updateTemplate = authProcedure
  .input(
    createTemplateSchema.extend({
      id: z.string(),
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

    const updatedTemplate = await prisma.template.update({
      where: { id: input.id },
      data: {
        name: input.name,
        description: input.description,
        content: input.content,
      },
    })

    return { template: updatedTemplate }
  })

export const deleteTemplate = authProcedure
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

    await prisma.template.delete({
      where: { id: input.id },
    })

    return { success: true }
  })
