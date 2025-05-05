"use client"

import { MoreHorizontal, Trash, Eye, Edit } from "lucide-react"
import {
  Button,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@repo/ui"
import { ColumnDef } from "@tanstack/react-table"
import { Template } from "backend"
import { UpdateTemplateDialog } from "./update-template-dialog"
import { ViewTemplateDialog } from "./view-template-dialog"
import { displayDateTime } from "@/utils"

interface ColumnActions {
  onDelete: (id: string) => void
  onDuplicate: (template: Template) => void
  organizationId: string
}

export const columns = (actions: ColumnActions): ColumnDef<Template>[] => [
  {
    accessorKey: "name",
    header: "Name",
    cell: ({ row }) => (
      <div>
        <div className="font-medium">{row.original.name}</div>
        <div className="text-sm text-muted-foreground">
          {row.original.description}
        </div>
      </div>
    ),
  },
  {
    accessorKey: "subject",
    header: "Subject",
  },
  {
    accessorKey: "createdAt",
    header: "Created At",
    cell: ({ row }) => {
      return displayDateTime(row.original.createdAt)
    },
  },
  {
    accessorKey: "updatedAt",
    header: "Updated At",
    cell: ({ row }) => displayDateTime(row.original.updatedAt),
  },
  {
    id: "actions",
    cell: ({ row }) => {
      const template = row.original

      return (
        <div className="flex items-center justify-end gap-2">
          <ViewTemplateDialog
            template={template}
            trigger={
              <Button variant="ghost" size="icon">
                <Eye className="h-4 w-4" />
              </Button>
            }
          />
          <UpdateTemplateDialog
            template={template}
            organizationId={actions.organizationId}
            trigger={
              <Button variant="ghost" size="icon">
                <Edit className="h-4 w-4" />
              </Button>
            }
          />
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="h-8 w-8 p-0">
                <span className="sr-only">Open menu</span>
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuLabel>Actions</DropdownMenuLabel>
              <DropdownMenuItem
                onClick={() => navigator.clipboard.writeText(template.id)}
              >
                Copy ID
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem>Edit Template</DropdownMenuItem>
              <DropdownMenuItem>Duplicate Template</DropdownMenuItem>
              <DropdownMenuItem
                className="text-destructive"
                onClick={() => actions.onDelete(template.id)}
              >
                <Trash className="mr-2 h-4 w-4" />
                Delete Template
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      )
    },
  },
]
