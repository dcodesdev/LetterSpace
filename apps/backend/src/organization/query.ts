import { TRPCError } from "@trpc/server"
import { z } from "zod"
import { authProcedure } from "../trpc"
import { prisma } from "../utils/prisma"

export const getOrganizationById = authProcedure
  .input(
    z.object({
      id: z.string(),
    })
  )
  .query(async ({ ctx, input }) => {
    const userOrg = await prisma.userOrganization.findFirst({
      where: {
        userId: ctx.user.id,
        organizationId: input.id,
      },
    })

    if (!userOrg) {
      throw new TRPCError({
        code: "UNAUTHORIZED",
        message: "You do not have access to this organization.",
      })
    }

    const organization = await prisma.organization.findUnique({
      where: { id: input.id },
      select: {
        id: true,
        name: true,
        description: true,
        createdAt: true,
        updatedAt: true,
      },
    })

    if (!organization) {
      throw new TRPCError({
        code: "NOT_FOUND",
        message: "Organization not found.",
      })
    }

    return organization
  })
