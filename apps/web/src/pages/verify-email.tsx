import { useEffect, useState } from "react"
import { useLocation, useNavigate } from "react-router"
import { Button } from "@repo/ui"
import { Check, Mail, X } from "lucide-react"
import { trpc } from "@/trpc"

export function VerifyEmailPage() {
  const [status, setStatus] = useState<"loading" | "success" | "error">(
    "loading"
  )
  const [message, setMessage] = useState("")
  const navigate = useNavigate()
  const location = useLocation()

  const verifyEmail = trpc.subscriber.verifyEmail.useMutation({
    onSuccess: () => {
      setStatus("success")
      setMessage("Your email has been verified successfully!")
    },
    onError: (error) => {
      setStatus("error")
      setMessage(
        error.message ||
          "Could not verify your email. The link may be invalid or expired."
      )
    },
  })

  useEffect(() => {
    const params = new URLSearchParams(location.search)
    const token = params.get("token")

    if (!token) {
      setStatus("error")
      setMessage("Verification token is missing")
      return
    }

    verifyEmail.mutate({ token })
  }, [location.search]) // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="min-h-screen bg-gray-900 flex flex-col items-center justify-center">
      <div className="w-full max-w-md px-8 py-12 rounded-lg bg-gray-800 border border-gray-700 shadow-xl">
        <h1 className="text-3xl font-bold text-center mb-8 text-white">
          Email <span className="text-[#4ECDC4]">Verification</span>
        </h1>

        {status === "loading" && (
          <div className="flex flex-col items-center">
            <div className="relative w-20 h-20 mb-8">
              <div className="absolute inset-0 rounded-full bg-gradient-to-br from-[#1a1a1a] to-[#121212] flex items-center justify-center">
                <Mail className="h-10 w-10 text-[#4ECDC4] animate-pulse" />
                <div className="absolute inset-0 bg-gradient-to-br from-[#4ECDC4]/10 to-transparent blur-xl animate-pulse"></div>
              </div>
            </div>
            <p className="text-gray-300">Verifying your email address...</p>
          </div>
        )}

        {status === "success" && (
          <div className="text-center">
            <div className="mb-8 flex justify-center">
              <div className="relative w-20 h-20 rounded-full bg-gradient-to-br from-[#1a1a1a] to-[#121212] flex items-center justify-center">
                <Check className="h-10 w-10 text-[#4ECDC4]" />
                <div className="absolute inset-0 bg-gradient-to-br from-[#4ECDC4]/10 to-transparent blur-xl animate-pulse"></div>
              </div>
            </div>
            <p className="mb-8 text-gray-300">{message}</p>
            <Button
              onClick={() => navigate("/")}
              className="w-full bg-[#4ECDC4] hover:bg-[#3DBDB5] text-black font-medium"
            >
              Return to Homepage
            </Button>
          </div>
        )}

        {status === "error" && (
          <div className="text-center">
            <div className="mb-8 flex justify-center">
              <div className="relative w-20 h-20 rounded-full bg-gradient-to-br from-[#1a1a1a] to-[#121212] flex items-center justify-center">
                <X className="h-10 w-10 text-red-500" />
                <div className="absolute inset-0 bg-gradient-to-br from-red-500/10 to-transparent blur-xl animate-pulse"></div>
              </div>
            </div>
            <p className="mb-8 text-gray-300">{message}</p>
            <Button
              onClick={() => navigate("/")}
              className="w-full bg-[#4ECDC4] hover:bg-[#3DBDB5] text-black font-medium"
            >
              Return to Homepage
            </Button>
          </div>
        )}
      </div>
    </div>
  )
}
