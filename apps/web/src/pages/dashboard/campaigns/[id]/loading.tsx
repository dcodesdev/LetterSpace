import { ArrowLeft } from "lucide-react"
import { Button } from "@repo/ui"
import { useNavigate } from "react-router"

export const Loading = () => {
  const navigate = useNavigate()

  return (
    <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            onClick={() => navigate("/dashboard/campaigns")}
            size="icon"
            className="rounded-full"
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-3xl font-bold">Loading Campaign...</h1>
          </div>
        </div>
      </div>
    </div>
  )
}
