import { TRPCError } from "@trpc/server"
import fs from "fs/promises"
import { z } from "zod"
import { authProcedure } from "../trpc"
import { prisma } from "../utils/prisma"

const createOrganizationSchema = z.object({
  name: z.string().min(1, "Organization name is required"),
  description: z.string().optional(),
})

export const createOrganization = authProcedure
  .input(createOrganizationSchema)
  .mutation(async ({ ctx, input }) => {
    const organization = await prisma.organization.create({
      data: {
        name: input.name,
        description: input.description,
        UserOrganizations: {
          create: {
            userId: ctx.user.id,
          },
        },
        Templates: {
          createMany: {
            data: [
              {
                name: "Newsletter",
                content: await fs.readFile(
                  "templates/newsletter.html",
                  "utf-8"
                ),
              },
            ],
          },
        },
        EmailDeliverySettings: {
          // Default settings
          create: {},
        },
        GeneralSettings: {
          // Default settings
          create: {},
        },
      },
      select: {
        id: true,
        name: true,
        description: true,
        createdAt: true,
      },
    })

    return {
      organization,
    }
  })

const updateOrganizationSchema = z.object({
  id: z.string(),
  name: z.string().min(1, "Organization name is required"),
  description: z.string().optional(),
})

export const updateOrganization = authProcedure
  .input(updateOrganizationSchema)
  .mutation(async ({ ctx, input }) => {
    const userOrg = await prisma.userOrganization.findFirst({
      where: {
        userId: ctx.user.id,
        organizationId: input.id,
      },
    })

    if (!userOrg) {
      throw new TRPCError({
        code: "UNAUTHORIZED",
        message: "You do not have access to update this organization.",
      })
    }

    const updatedOrganization = await prisma.organization.update({
      where: { id: input.id },
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

    return { organization: updatedOrganization }
  })
