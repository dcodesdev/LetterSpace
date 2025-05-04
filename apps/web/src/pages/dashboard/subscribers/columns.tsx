import { Edit, MoreHorizontal, Trash } from "lucide-react"
import {
  Button,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@repo/ui"
import { ColumnDef } from "@tanstack/react-table"
import { PopulatedSubscriber } from "./page"
import dayjs from "dayjs"
import { ListCell } from "./cells/list-cell"

interface ColumnActions {
  onDelete: (id: string) => void
  onEdit: (subscriber: PopulatedSubscriber) => void
}

export const columns = ({
  onDelete,
  onEdit,
}: ColumnActions): ColumnDef<PopulatedSubscriber>[] => [
  // {
  //   id: "select",
  //   header: ({ table }) => (
  //     <Checkbox
  //       checked={
  //         table.getIsAllPageRowsSelected() ||
  //         (table.getIsSomePageRowsSelected() && "indeterminate")
  //       }
  //       onCheckedChange={(value) => table.toggleAllPageRowsSelected(!!value)}
  //       aria-label="Select all"
  //     />
  //   ),
  //   cell: ({ row }) => (
  //     <Checkbox
  //       checked={row.getIsSelected()}
  //       onCheckedChange={(value) => row.toggleSelected(!!value)}
  //       aria-label="Select row"
  //     />
  //   ),
  // },
  {
    accessorKey: "name",
    header: "Name",
    cell: ({ row }) => (
      <div>
        <div className="font-medium">{row.getValue("name")}</div>
        <div className="text-sm text-muted-foreground">
          {row.original.email}
        </div>
      </div>
    ),
  },
  {
    accessorKey: "createdAt",
    header: "Joined",
    cell: ({ row }) => dayjs(row.original.createdAt).format("DD/MM/YYYY"),
  },
  {
    accessorKey: "lastOpened",
    header: "Last Opened",
    cell: ({ row }) => {
      const date = row.getValue("lastOpened")
      return date ? new Date(date as string).toLocaleDateString() : "-"
    },
  },
  {
    accessorKey: "openRate",
    header: "Open Rate",
    cell: ({ row }) => {
      const openRate = row.getValue("openRate") as number
      const status =
        openRate > 80
          ? "text-emerald-500"
          : openRate > 50
            ? "text-yellow-500"
            : "text-red-500"
      return <div className={status}>{openRate}%</div>
    },
  },
  {
    accessorKey: "ListSubscribers",
    header: "Lists",
    cell: ({ row }) => (
      <ListCell
        subscriber={row.original}
        organizationId={row.original.organizationId}
      />
    ),
  },
  {
    id: "actions",
    cell: ({ row }) => (
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" className="h-8 w-8 p-0">
            <span className="sr-only">Open menu</span>
            <MoreHorizontal className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem onClick={() => onEdit(row.original)}>
            <Edit className="mr-2 h-4 w-4" />
            Edit
          </DropdownMenuItem>
          <DropdownMenuItem
            className="text-red-600"
            onClick={() => onDelete(row.original.id)}
          >
            <Trash className="mr-2 h-4 w-4" />
            Delete
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    ),
  },
]
