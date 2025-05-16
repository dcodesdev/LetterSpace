import { z } from "zod"
import { authProcedure } from "../trpc"
import { prisma } from "../utils/prisma"
import { TRPCError } from "@trpc/server"
import { MessageStatus } from "../../prisma/client"

export const resendMessage = authProcedure
  .input(
    z.object({
      messageId: z.string(),
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
        message: "You do not have access to this organization.",
      })
    }

    const message = await prisma.message.findFirst({
      where: {
        id: input.messageId,
        Campaign: {
          organizationId: input.organizationId,
        },
      },
    })

    if (!message) {
      throw new TRPCError({
        code: "NOT_FOUND",
        message: "Message not found or you don't have access.",
      })
    }

    const updatedMessage = await prisma.message.update({
      where: {
        id: input.messageId,
      },
      data: {
        status: MessageStatus.QUEUED,
        tries: 0,
        lastTriedAt: null,
        error: null,
        messageId: null,
      },
    })

    return updatedMessage
  })
