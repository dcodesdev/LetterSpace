import { useState } from "react"
import { Mail, MailX, CheckCircle, AlertCircle } from "lucide-react"
import { Link, useSearchParams } from "react-router"
import { Button } from "@repo/ui"
import { trpc } from "@/trpc"
import { IconBrandGithub } from "@tabler/icons-react"
import { constants } from "@/constants"

export function UnsubscribePage() {
  const [error, setError] = useState<string | null>(null)
  const [searchParams] = useSearchParams()

  const subscriberId = searchParams.get("sid")
  const campaignId = searchParams.get("cid")

  const unsubscribeUser = trpc.subscriber.unsubscribe.useMutation({
    onError: (error) => {
      setError(error.message)
    },
  })

  if (!subscriberId || !campaignId) {
    return (
      <PageWrapper>
        <div className="flex justify-center">
          <AlertCircle className="w-12 h-12 text-red-500" />
        </div>
        <h1 className="text-2xl font-bold text-white mb-4">Invalid URL</h1>
        <p className="text-gray-400">
          The unsubscribe link appears to be invalid or incomplete. Please check
          your email for the correct link.
        </p>
      </PageWrapper>
    )
  }

  const handleUnsubscribe = () => {
    unsubscribeUser.mutate({ sid: subscriberId, cid: campaignId })
  }

  if (unsubscribeUser.isSuccess) {
    return (
      <PageWrapper>
        <div className="flex justify-center">
          <CheckCircle className="w-12 h-12 text-green-500" />
        </div>
        <h1 className="text-2xl font-bold text-white mb-4">
          Unsubscribed Successfully
        </h1>
        <p className="text-gray-400">
          You have been unsubscribed from our newsletter. We're sorry to see you
          go!
        </p>
      </PageWrapper>
    )
  }

  return (
    <PageWrapper>
      <div className="flex justify-center">
        <Mail className="w-12 h-12 text-gray-400 mb-2" />
      </div>
      <h1 className="text-2xl font-bold text-white mb-4">
        Unsubscribe from Newsletter
      </h1>
      <p className="text-gray-400 mb-6">
        Are you sure you want to unsubscribe from our newsletter? You will no
        longer receive updates from us.
      </p>
      <Button
        onClick={handleUnsubscribe}
        variant="destructive"
        className="w-full bg-red-500 hover:bg-red-600"
      >
        <MailX className="w-4 h-4 mr-2" />
        Unsubscribe
      </Button>
      {error && (
        <div className="flex items-center justify-center text-red-400 mt-4">
          <AlertCircle className="w-4 h-4 mr-2" />
          <p>{error}</p>
        </div>
      )}
    </PageWrapper>
  )
}

const PageWrapper = ({ children }: { children: React.ReactNode }) => (
  <div className="flex flex-col items-center justify-center min-h-screen bg-[#0a0c10]">
    <div className="max-w-md p-8 bg-[#12141a] rounded-lg shadow-xl text-center space-y-6">
      {children}
    </div>
    <footer className="mt-8 text-sm text-gray-500">
      <Link
        to={constants.GITHUB_URL}
        className="flex items-center hover:text-gray-300 transition-colors"
        target="_blank"
        rel="noopener noreferrer"
      >
        <IconBrandGithub className="w-4 h-4 mr-2" />
        Powered by Your Newsletter App
      </Link>
    </footer>
  </div>
)
