import { TRPCError } from "@trpc/server"
import { authProcedure, publicProcedure } from "../trpc"
import { prisma } from "../utils/prisma"

export const me = authProcedure.query(async ({ ctx }) => {
  const user = await prisma.user.findUnique({
    where: { id: ctx.user.id },
    include: {
      UserOrganizations: {
        include: {
          Organization: true,
        },
      },
    },
  })

  if (!user) {
    throw new TRPCError({
      code: "UNAUTHORIZED",
      message: "User not found",
    })
  }

  return user
})

export const isFirstUser = publicProcedure.query(async () => {
  const user = await prisma.user.count()
  return user === 0
})
