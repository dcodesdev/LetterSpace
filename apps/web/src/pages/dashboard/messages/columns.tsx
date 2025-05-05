import { ColumnDef } from "@tanstack/react-table"
import { Button } from "@repo/ui"
import { Eye, AlertCircle } from "lucide-react"
import { Link } from "react-router"
import { MessageStatusBadge } from "./message-status-badge"
import { MessagePreviewDialog } from "./message-preview-dialog"
import { MessageErrorDialog } from "./message-error-dialog"
import { Message } from "backend"
import { displayDateTime } from "@/utils"

type ColumnsProps = {
  onOpenPreview: (id: string) => void
  onOpenError: (id: string) => void
  openPreviews: Record<string, boolean>
  openErrors: Record<string, boolean>
  onClosePreview: (id: string) => void
  onCloseError: (id: string) => void
}

export const columns = ({
  onOpenPreview,
  onOpenError,
  openPreviews,
  openErrors,
  onClosePreview,
  onCloseError,
}: ColumnsProps): ColumnDef<
  Message & {
    Subscriber: {
      name: string | null
      email: string
    }
    Campaign: {
      id: string
      title: string
    }
  }
>[] => [
  {
    accessorKey: "recipient",
    header: "Recipient",
    cell: ({ row }) => (
      <div>
        <p className="font-medium">{row.original.Subscriber.name}</p>
        <p className="text-sm text-muted-foreground">
          {row.original.Subscriber.email}
        </p>
      </div>
    ),
  },
  {
    accessorKey: "campaign",
    header: "Campaign",
    cell: ({ row }) => (
      <Link
        to={`/dashboard/campaigns/${row.original.Campaign.id}`}
        className="text-primary hover:underline"
      >
        {row.original.Campaign.title}
      </Link>
    ),
  },
  {
    accessorKey: "status",
    header: "Status",
    cell: ({ row }) => <MessageStatusBadge status={row.original.status} />,
  },
  {
    accessorKey: "sentAt",
    header: "Sent At",
    cell: ({ row }) =>
      row.original.sentAt ? displayDateTime(row.original.sentAt) : "-",
  },
  {
    id: "actions",
    cell: ({ row }) => (
      <div className="flex items-center gap-2">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => onOpenPreview(row.original.id)}
        >
          <Eye className="h-4 w-4" />
        </Button>
        {row.original.error && (
          <Button
            variant="ghost"
            size="icon"
            className="text-destructive"
            onClick={() => onOpenError(row.original.id)}
          >
            <AlertCircle className="h-4 w-4" />
          </Button>
        )}
        <MessagePreviewDialog
          message={row.original}
          open={openPreviews[row.original.id] ?? false}
          onOpenChange={(open) =>
            open
              ? onOpenPreview(row.original.id)
              : onClosePreview(row.original.id)
          }
        />
        <MessageErrorDialog
          message={row.original}
          open={openErrors[row.original.id] ?? false}
          onOpenChange={(open) =>
            open ? onOpenError(row.original.id) : onCloseError(row.original.id)
          }
        />
      </div>
    ),
  },
]
