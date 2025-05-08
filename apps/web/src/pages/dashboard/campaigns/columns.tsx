import { ColumnDef } from "@tanstack/react-table"
import { Button, cn } from "@repo/ui"
import { Trash } from "lucide-react"
import { CampaignStatus } from "backend"
import { Link } from "react-router"
import { displayDateTime } from "@/utils"

const statusConfig: Record<
  CampaignStatus,
  { label: string; className: string }
> = {
  DRAFT: {
    label: "Draft",
    className:
      "bg-primary text-primary-foreground dark:bg-primary dark:text-primary-foreground",
  },
  SCHEDULED: {
    label: "Scheduled",
    className: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200",
  },
  CREATING: {
    label: "Creating",
    className: "bg-gray-200 text-gray-800 dark:bg-gray-700 dark:text-gray-200",
  },
  SENDING: {
    label: "Sending",
    className:
      "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200",
  },
  COMPLETED: {
    label: "Sent",
    className:
      "bg-emerald-600 text-gray-100 dark:bg-success dark:text-success-foreground",
  },
  CANCELLED: {
    label: "Cancelled",
    className:
      "bg-destructive text-destructive-foreground dark:bg-destructive dark:text-destructive-foreground",
  },
}

type Campaign = {
  id: string
  title: string
  status: CampaignStatus
  scheduledAt: Date | null
  _count: {
    Messages: number
  }
}

type ColumnsProps = {
  onDelete: (id: string) => void
}

export const columns = ({ onDelete }: ColumnsProps): ColumnDef<Campaign>[] => [
  {
    accessorKey: "title",
    header: "Campaign Name",
    cell: ({ row }) => (
      <Link
        className="underline"
        to={`/dashboard/campaigns/${row.original.id}`}
      >
        {row.original.title}
      </Link>
    ),
  },
  {
    accessorKey: "status",
    header: "Status",
    cell: ({ row }) => {
      const status = row.getValue("status") as CampaignStatus
      return (
        <span
          className={cn(
            "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium",
            statusConfig[status].className
          )}
        >
          {statusConfig[status].label}
        </span>
      )
    },
  },
  {
    accessorKey: "scheduledAt",
    header: "Sent Date",
    cell: ({ row }) => {
      const date = row.original.scheduledAt
      return date ? displayDateTime(date) : "-"
    },
  },
  {
    accessorKey: "_count.Messages",
    header: "Recipients",
    cell: ({ row }) => row.original._count.Messages.toLocaleString(),
  },
  // {
  //   accessorKey: "openRate",
  //   header: "Open Rate",
  //   cell: ({ row }) => row.original.openRate.toLocaleString(),
  // },
  // {
  //   accessorKey: "clickRate",
  //   header: "Click Rate",
  //   cell: ({ row }) => row.original.clickRate.toLocaleString(),
  // },
  {
    id: "actions",
    cell: ({ row }) => (
      <div className="flex space-x-2" onClick={(e) => e.stopPropagation()}>
        <Button
          variant="ghost"
          size="icon"
          onClick={() => onDelete(row.original.id)}
          className="text-destructive hover:text-destructive/80"
        >
          <Trash className="h-4 w-4" />
        </Button>
      </div>
    ),
  },
]
