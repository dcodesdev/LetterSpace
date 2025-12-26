import { useState } from "react"
import { Upload, FileText, AlertCircle, Check } from "lucide-react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  Button,
  Alert,
  AlertDescription,
  AlertTitle,
} from "@repo/ui"
import { trpc } from "@/trpc"
import { useSession } from "@/hooks"
import { WithTooltip } from "./with-tooltip"

const VALID_HEADERS = [
  "email",
  "first_name",
  "last_name",
  "phone",
  "company",
  "job_title",
  "city",
  "country",
  "subscribed_at",
  "tags",
] as const

interface ImportSubscribersDialogProps {
  onSuccess?: () => void
  listId?: string
}

export function ImportSubscribersDialog({
  onSuccess,
  listId,
}: ImportSubscribersDialogProps) {
  const [open, setOpen] = useState(false)
  const [file, setFile] = useState<File | null>(null)
  const [error, setError] = useState<string | null>(null)
  const { organization } = useSession()

  const importMutation = trpc.subscriber.import.useMutation({
    onSuccess: () => {
      setOpen(false)
      setFile(null)
      setError(null)
      onSuccess?.()
    },
    onError: (error) => {
      setError(error.message)
    },
  })

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    if (!file.name.endsWith(".csv")) {
      setError("Please upload a CSV file")
      return
    }

    setFile(file)
    setError(null)
  }

  const handleImport = async () => {
    if (!file || !organization?.id) return

    const formData = new FormData()
    formData.append("file", file)
    formData.append("organizationId", organization.id)
    if (listId) {
      formData.append("listId", listId)
    }

    importMutation.mutate({
      file: formData,
      organizationId: organization.id,
      listId,
    })
  }

  const downloadTemplate = () => {
    const headers = VALID_HEADERS.join(",")
    const blob = new Blob([headers], { type: "text/csv" })
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = "subscribers_template.csv"
    a.click()
    window.URL.revokeObjectURL(url)
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <WithTooltip content="Import subscribers">
        <DialogTrigger asChild>
          <Button variant="outline" size="icon">
            <Upload className="h-4 w-4" />
          </Button>
        </DialogTrigger>
      </WithTooltip>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Import Subscribers</DialogTitle>
          <DialogDescription>
            Upload a CSV file with subscriber data. Download the template to see
            the correct format.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <Button variant="outline" onClick={downloadTemplate}>
            <FileText className="h-4 w-4 mr-2" />
            Download Template
          </Button>

          <div className="grid w-full items-center gap-1.5">
            <label
              htmlFor="file"
              className="border-2 border-dashed rounded-lg p-8 text-center cursor-pointer hover:border-primary/50 transition-colors"
            >
              {file ? (
                <div className="flex items-center justify-center gap-2 text-sm">
                  <Check className="h-4 w-4 text-emerald-500" />
                  {file.name}
                </div>
              ) : (
                <div className="text-sm text-muted-foreground">
                  Click to upload or drag and drop
                  <br />
                  CSV files only
                </div>
              )}
              <input
                id="file"
                type="file"
                accept=".csv"
                onChange={handleFileChange}
                className="hidden"
              />
            </label>
          </div>

          {error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>Error</AlertTitle>
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleImport}
              disabled={!file || importMutation.isPending}
            >
              {importMutation.isPending ? (
                <>
                  <div className="h-4 w-4 mr-2 animate-spin rounded-full border-2 border-current border-t-transparent" />
                  Importing...
                </>
              ) : (
                "Import"
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
