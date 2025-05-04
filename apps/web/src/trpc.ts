import { createTRPCClient, httpBatchLink } from "@trpc/client"
import { createTRPCReact } from "@trpc/react-query"

import type { AppRouter } from "backend"
import { constants } from "./constants"
import Cookies from "js-cookie"
import SuperJSON from "superjson"

export const trpc = createTRPCReact<AppRouter>()

export const trpcClient = createTRPCClient<AppRouter>({
  links: [
    httpBatchLink({
      url: `${constants.VITE_API_URL}/trpc`,
      async headers() {
        return {
          authorization: Cookies.get("token")
            ? `Bearer ${Cookies.get("token")}`
            : undefined,
        }
      },
      transformer: SuperJSON,
    }),
  ],
})
