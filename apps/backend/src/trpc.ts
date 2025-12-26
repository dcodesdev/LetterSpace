import { initTRPC, TRPCError } from "@trpc/server"
import * as trpcExpress from "@trpc/server/adapters/express"
import { verifyToken } from "./utils/auth"
import { prisma } from "./utils/prisma"
import { tokenPayloadSchema } from "./utils/token"
import SuperJSON from "superjson"

interface User {
  id: string
}

interface Context {
  user?: User
}

export const createContext = async ({
  req,
}: trpcExpress.CreateExpressContextOptions): Promise<Context> => {
  const authHeader = req.headers.authorization

  if (!authHeader) {
    return {}
  }

  try {
    const token = authHeader.split(" ")[1]

    if (!token) {
      return {}
    }

    const decodedRaw = verifyToken(token)

    const result = tokenPayloadSchema.safeParse(decodedRaw)

    if (!result.success) {
      return {}
    }

    const decoded = result.data
    const user = await prisma.user.findUnique({
      where: { id: decoded.id },
      select: { id: true, pwdVersion: true },
    })

    if (!user) {
      return {}
    }

    if (user.pwdVersion !== decoded.version) {
      return {}
    }

    return { user }
  } catch {
    return {}
  }
}

const t = initTRPC.context<Context>().create({
  transformer: SuperJSON,
})

export const router = t.router
export const publicProcedure = t.procedure

const isAuthedMiddleware = t.middleware(({ ctx, next }) => {
  if (!ctx.user) {
    throw new TRPCError({
      code: "UNAUTHORIZED",
      message: "You must be logged in to access this resource",
    })
  }
  return next({
    ctx: {
      user: ctx.user,
    },
  })
})

export const authProcedure = t.procedure.use(isAuthedMiddleware)
