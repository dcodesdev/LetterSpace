import { Plus, Trash } from "lucide-react"
import {
  type ColumnFiltersState,
  type SortingState,
  type VisibilityState,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
} from "@tanstack/react-table"
import { Button } from "@repo/ui"
import { columns } from "./columns"
import { toast } from "sonner"
import { useState, useEffect } from "react"
import { trpc } from "@/trpc"
import { useSession, usePaginationWithQueryState } from "@/hooks"
import { DataTable } from "@repo/ui"
import { Pagination } from "@/components"
import { SubscriberSearch } from "./subscriber-search"
import { EditSubscriberDialogState } from "./types"
import { SubscriberStats } from "./subscriber-stats"
import { AddSubscriberDialog } from "./add-subscriber-dialog"
import { EditSubscriberDialog } from "./edit-subscriber-dialog"
import { DeleteSubscriberAlertDialog } from "./delete-subscriber-alert-dialog"

export function SubscribersPage() {
  const [sorting, setSorting] = useState<SortingState>([])
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([])
  const [columnVisibility, setColumnVisibility] = useState<VisibilityState>({})
  const [rowSelection, setRowSelection] = useState({})
  const [isAddingSubscriber, setIsAddingSubscriber] = useState(false)
  const [subscriberToDelete, setSubscriberToDelete] = useState<string | null>(
    null
  )
  const [editDialog, setEditDialog] = useState<EditSubscriberDialogState>({
    open: false,
    subscriber: null,
  })
  const { pagination, setPagination } = usePaginationWithQueryState({
    perPage: 8,
  })

  const { organization } = useSession()

  const utils = trpc.useUtils()

  const { data, isLoading } = trpc.subscriber.list.useQuery(
    {
      organizationId: organization?.id ?? "",
      page: pagination.page,
      perPage: pagination.perPage,
      search: pagination.searchQuery,
    },
    {
      enabled: !!organization?.id,
    }
  )

  const deleteSubscriber = trpc.subscriber.delete.useMutation({
    onSuccess: () => {
      // invalidate the lists so that on the campaign/:id page
      // the number of recipients get updated
      utils.list.invalidate()
      utils.subscriber.invalidate()
      table.toggleAllRowsSelected(false)
    },
    onError: (error) => {
      toast.error(error.message)
    },
  })

  const handleDeleteClick = (id: string) => {
    setSubscriberToDelete(id)
  }

  const table = useReactTable({
    data: data?.subscribers ?? [],
    columns: columns({
      onDelete: handleDeleteClick,
      onEdit: (subscriber) => setEditDialog({ open: true, subscriber }),
    }),
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    onColumnVisibilityChange: setColumnVisibility,
    onRowSelectionChange: setRowSelection,
    enableRowSelection: true,
    enableMultiRowSelection: true,
    state: {
      sorting,
      columnFilters,
      columnVisibility,
      rowSelection,
    },
  })

  const lists = trpc.list.list.useQuery({
    organizationId: organization?.id ?? "",
  })

  const handleDeleteSubscriber = () => {
    if (!subscriberToDelete) return

    const ids = subscriberToDelete.split(",")

    // TODO: Send with one request
    ids.forEach((id) => {
      deleteSubscriber.mutate({
        id,
        organizationId: organization?.id ?? "",
      })
    })

    setSubscriberToDelete(null)
  }

  const { data: analytics, isLoading: analyticsLoading } =
    trpc.stats.getStats.useQuery(
      {
        organizationId: organization?.id ?? "",
      },
      {
        enabled: !!organization?.id,
      }
    )

  useEffect(() => {
    setPagination("totalPages", data?.pagination.totalPages)
  }, [data]) // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
      <div className="flex items-center justify-between">
        <h2 className="text-3xl font-bold tracking-tight">Subscribers</h2>
      </div>

      {/* Stats Overview */}
      <SubscriberStats analytics={analytics} isLoading={analyticsLoading} />

      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex flex-1 items-center space-x-2">
            <SubscriberSearch />
            {/* Filter */}
            {/* <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="icon">
                  <SlidersHorizontal className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                {table
                  .getAllColumns()
                  .filter((column) => column.getCanHide())
                  .map((column) => {
                    return (
                      <DropdownMenuCheckboxItem
                        key={column.id}
                        className="capitalize"
                        checked={column.getIsVisible()}
                        onCheckedChange={(value) =>
                          column.toggleVisibility(!!value)
                        }
                      >
                        {column.id}
                      </DropdownMenuCheckboxItem>
                    )
                  })}
              </DropdownMenuContent>
            </DropdownMenu> */}
          </div>
          <div className="flex items-center gap-2">
            <AddSubscriberDialog
              open={isAddingSubscriber}
              onOpenChange={setIsAddingSubscriber}
              onSuccess={() => {
                // Optionally, you can add any specific logic needed on success in the parent page
              }}
            />
            {/* <ImportSubscribersDialog
              onSuccess={() => {
                utils.subscriber.list.invalidate()
              }}
            />

            <WithTooltip content="Export subscribers">
              <Button
                onClick={handleExportSubscribers}
                variant="outline"
                size="icon"
              >
                <Download className="h-4 w-4" />
              </Button>
            </WithTooltip> */}
          </div>
        </div>
        {Object.keys(rowSelection).length > 0 && (
          <div className="flex items-center gap-2 py-2">
            <Button
              variant="outline"
              size="sm"
              className="text-red-600"
              onClick={() => {
                const selectedIds = table
                  .getSelectedRowModel()
                  .rows.map((row) => row.original.id)
                setSubscriberToDelete(selectedIds.join(","))
              }}
            >
              <Trash className="h-4 w-4 mr-2" />
              Delete {Object.keys(rowSelection).length} subscriber
              {Object.keys(rowSelection).length === 1 ? "" : "s"}
            </Button>
          </div>
        )}
        <DataTable
          title="Subscribers"
          columns={columns({
            onDelete: handleDeleteClick,
            onEdit: (subscriber) => setEditDialog({ open: true, subscriber }),
          })}
          data={data?.subscribers ?? []}
          className="h-[calc(100vh-440px)]"
          isLoading={isLoading}
          NoResultsContent={
            <div className="flex flex-col items-center justify-center h-full my-10 gap-3">
              <p className="text-sm text-muted-foreground">
                No subscribers found.
              </p>
              <p className="text-xs text-muted-foreground">
                Add a new subscriber to get started.
              </p>
              <Button onClick={() => setIsAddingSubscriber(true)}>
                Add a Subscriber <Plus className="ml-2 h-4 w-4" />
              </Button>
            </div>
          }
        />
        <div className="flex items-center justify-between">
          <div className="flex-1 text-sm text-muted-foreground">
            {data?.pagination.total ?? 0} total subscribers
          </div>
          <Pagination
            page={pagination.page}
            totalPages={pagination.totalPages}
            onPageChange={(page) => setPagination("page", page)}
            hasNextPage={pagination.page < pagination.totalPages}
          />
        </div>
      </div>

      {/* Delete Subscriber Alert Dialog */}
      <DeleteSubscriberAlertDialog
        open={subscriberToDelete !== null}
        onOpenChange={(open) => !open && setSubscriberToDelete(null)}
        onConfirm={handleDeleteSubscriber}
        subscriberToDelete={subscriberToDelete}
        isPending={deleteSubscriber.isPending}
      />

      {/* Edit Subscriber Dialog */}
      <EditSubscriberDialog
        open={editDialog.open}
        subscriber={editDialog.subscriber}
        onOpenChange={(open) => {
          setEditDialog((prev) => ({ ...prev, open }))
          // Reset logic is handled within EditSubscriberDialog
        }}
        lists={lists.data}
      />
    </div>
  )
}
