import { appRouter } from "@src/app"
import { createContext } from "@src/trpc"
import type * as trpcExpress from "@trpc/server/adapters/express"
import { expect } from "vitest"
import { fakeRequest } from "./fake-request"

type CallerUser = { id: string } | undefined

export const createCaller = (user?: CallerUser) =>
  appRouter.createCaller({ user })

/**
 * Builds a caller through the real `createContext`, so tests can assert on
 * token verification (expiry, `pwdVersion` bumps) and not just the routers.
 */
export const createCallerFromToken = async (token?: string) => {
  const ctx = await createContext({
    req: fakeRequest({
      headers: token ? { authorization: `Bearer ${token}` } : {},
    }),
  } as trpcExpress.CreateExpressContextOptions)

  return appRouter.createCaller(ctx)
}

export const expectTrpcError = async (
  promise: Promise<unknown>,
  code: string
) => {
  await expect(promise).rejects.toMatchObject({ code })
}
