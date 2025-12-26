import { Link } from "react-router"
import { ColumnDef } from "@tanstack/react-table"
import { Message } from "backend"
import { displayDateTime } from "@/utils"
import { MessageActions } from "./message-actions"
import { MessageIdCell } from "./message-id-cell"
import { MessageStatusBadge } from "./message-status-badge"

type MessageWithRelations = Message & {
  Subscriber: {
    name: string | null
    email: string
  }
  Campaign: {
    id: string
    title: string
  }
}

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
}: ColumnsProps): ColumnDef<MessageWithRelations>[] => {
  return [
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
      id: "messageId",
      header: "Message ID",
      cell: ({ row }) => <MessageIdCell messageId={row.original.messageId} />,
    },
    {
      id: "actions",
      cell: ({ row }) => (
        <MessageActions
          message={row.original}
          onOpenPreview={onOpenPreview}
          onClosePreview={onClosePreview}
          onOpenError={onOpenError}
          onCloseError={onCloseError}
          openPreviews={openPreviews}
          openErrors={openErrors}
        />
      ),
    },
  ]
}
