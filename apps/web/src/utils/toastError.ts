import type { TRPCClientErrorLike } from "@trpc/client"
import type { AppRouter } from "backend"
import { toast } from "sonner"

export const toastError = (
  message: string,
  error: TRPCClientErrorLike<AppRouter>
) => {
  try {
    const parsedMessage = JSON.parse(error.message)

    toast.error(message, {
      description: parsedMessage[0]?.message,
    })
  } catch (_error) {
    toast.error(message, {
      description: error.message,
    })
  }
}
