import { TRPCClientErrorLike } from "@trpc/client"
import { UseTRPCQueryResult } from "@trpc/react-query/shared"
import { inferRouterOutputs } from "@trpc/server"
import { AppRouter } from "backend"

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyFunction = (...args: any[]) => any

export type GetTRPCQueryResult<T extends AnyFunction> = UseTRPCQueryResult<
  Awaited<ReturnType<T>>,
  TRPCClientErrorLike<AppRouter>
>

export type RouterOutput = inferRouterOutputs<AppRouter>
