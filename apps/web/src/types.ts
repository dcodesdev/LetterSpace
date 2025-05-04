import { TRPCClientErrorLike } from "@trpc/client"
import {
  UseTRPCMutationResult,
  UseTRPCQueryResult,
} from "@trpc/react-query/shared"
import { AppRouter } from "backend"

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type AnyFunction = (...args: any[]) => any

export type GetTRPCQueryResult<T extends AnyFunction> = UseTRPCQueryResult<
  Awaited<ReturnType<T>>,
  TRPCClientErrorLike<AppRouter>
>

export type AwaitedReturnType<T extends AnyFunction> = Awaited<ReturnType<T>>

export type GetTRPCMutationResult<T extends AnyFunction> =
  UseTRPCMutationResult<
    Awaited<ReturnType<T>>,
    TRPCClientErrorLike<AppRouter>,
    Parameters<T>[0],
    unknown
  >
