import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { httpBatchLink } from "@trpc/client"
import { useState } from "react"
import { trpc } from "./trpc"
import { constants } from "./constants"
import Cookies from "js-cookie"
import SuperJSON from "superjson"

export function TrpcProvider({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(() => new QueryClient())
  const [trpcClient] = useState(() =>
    trpc.createClient({
      links: [
        httpBatchLink({
          url: constants.trpcUrl,
          fetch: async (input, init) => {
            const response = await fetch(input, init)

            if (response.status === 401) {
              Cookies.remove("token")
              window.location.href = "/"
            }
            return response
          },
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
  )
  return (
    <trpc.Provider client={trpcClient} queryClient={queryClient}>
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    </trpc.Provider>
  )
}
