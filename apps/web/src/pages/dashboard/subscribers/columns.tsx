import { Edit, MoreHorizontal, Trash } from "lucide-react"
import {
  Button,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  Badge,
} from "@repo/ui"
import { ColumnDef } from "@tanstack/react-table"
import { PopulatedSubscriber } from "./page"
import { ListCell } from "./cells/list-cell"
import { displayDateTime } from "@/utils"

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
    header: "Joined at",
    cell: ({ row }) => displayDateTime(row.original.createdAt),
  },
  {
    accessorKey: "emailVerified",
    header: "Email Status",
    cell: ({ row }) => {
      const isVerified = row.original.emailVerified
      return (
        <Badge variant={isVerified ? "default" : "secondary"}>
          {isVerified ? "Verified" : "Unverified"}
        </Badge>
      )
    },
  },
  {
    accessorKey: "ListSubscribers",
    header: "Subscription Status",
    cell: ({ row }) => {
      const listSubscribers = row.original.ListSubscribers
      if (!listSubscribers || listSubscribers.length === 0) {
        return <Badge variant="outline">No Lists</Badge>
      }
      const isSubscribedToAnyList = listSubscribers.some(
        (ls) => ls.unsubscribedAt === null
      )
      return (
        <Badge variant={isSubscribedToAnyList ? "default" : "secondary"}>
          {isSubscribedToAnyList ? "Subscribed" : "Unsubscribed"}
        </Badge>
      )
    },
  },
  {
    accessorKey: "lists",
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
