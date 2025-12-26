import { createTRPCReact } from "@trpc/react-query"

import type { AppRouter } from "backend"

export const trpc = createTRPCReact<AppRouter>()
