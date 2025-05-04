import { ColumnDef } from "@tanstack/react-table"
import { Button } from "@repo/ui"
import { PencilIcon, Trash2Icon } from "lucide-react"
import { IDField } from "./id-field"

type List = {
  id: string
  name: string
  description: string
  subscriberCount: number
}

type ColumnsProps = {
  onDelete: (id: string) => void
  onEdit: (list: List) => void
}

export const columns = ({
  onDelete,
  onEdit,
}: ColumnsProps): ColumnDef<List>[] => [
  {
    accessorKey: "id",
    header: "ID",
    cell: ({ row }) => <IDField id={row.original.id} />,
  },
  {
    accessorKey: "name",
    header: "Name",
    cell: ({ row }) => (
      <div className="font-medium">{row.getValue("name")}</div>
    ),
  },
  {
    accessorKey: "description",
    header: "Description",
  },
  {
    accessorKey: "subscriberCount",
    header: "Subscribers",
    cell: ({ row }) => row.original.subscriberCount,
  },
  {
    id: "actions",
    cell: ({ row }) => (
      <div className="flex justify-end space-x-2">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => onEdit(row.original)}
        >
          <PencilIcon className="h-4 w-4" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          onClick={() => onDelete(row.original.id)}
        >
          <Trash2Icon className="h-4 w-4 text-red-500" />
        </Button>
      </div>
    ),
  },
]
