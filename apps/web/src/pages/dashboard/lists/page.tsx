"use client"

import { useEffect, useState } from "react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  Button,
  DataTable,
} from "@repo/ui"
import { Plus } from "lucide-react"
import { CreateListForm } from "./list-form"
import { useSession, usePaginationWithQueryState } from "@/hooks"
import { trpc } from "@/trpc"
import { columns } from "./columns"
import { Pagination } from "@/components"
import { UpdateListForm } from "./update-list-form"
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogCancel,
} from "@repo/ui"
import { ListSearch } from "./list-search"

export function ListsPage() {
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [listToDelete, setListToDelete] = useState<string | null>(null)
  const [editDialogStates, setEditDialogStates] = useState<
    Record<string, boolean>
  >({})

  const { pagination, setPagination } = usePaginationWithQueryState()

  const { orgId } = useSession()
  const utils = trpc.useUtils()

  const { data, isLoading } = trpc.list.list.useQuery(
    {
      organizationId: orgId,
      page: pagination.page,
      perPage: pagination.perPage,
      search: pagination.searchQuery,
    },
    {
      enabled: !!orgId,
    }
  )

  useEffect(() => {
    setPagination("totalPages", data?.pagination.totalPages)
  }, [data]) // eslint-disable-line react-hooks/exhaustive-deps

  const deleteList = trpc.list.delete.useMutation({
    onSuccess: () => {
      utils.list.invalidate()
    },
  })

  const lists = data?.lists.map((list) => ({
    id: list.id,
    name: list.name,
    description: list.description ?? "",
    subscriberCount: list._count.ListSubscribers,
  }))

  const toggleEditDialog = (listId: string, isOpen: boolean) => {
    setEditDialogStates((prev) => ({
      ...prev,
      [listId]: isOpen,
    }))
  }

  return (
    <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
      <div className="flex items-center justify-between space-y-2">
        <h2 className="text-3xl font-bold tracking-tight">Lists</h2>
      </div>

      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex flex-1 items-center space-x-2">
            <ListSearch />
          </div>
          <div className="flex items-center gap-2">
            {/* <Button variant="outline" size="icon">
              <Download className="h-4 w-4" />
            </Button> */}
            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="mr-2 h-4 w-4" /> Create New List
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Create a New List</DialogTitle>
                  <DialogDescription>
                    Create a new list to organize your subscribers.
                  </DialogDescription>
                </DialogHeader>
                <CreateListForm onSuccess={() => setIsDialogOpen(false)} />
              </DialogContent>
            </Dialog>
          </div>
        </div>

        <DataTable
          title="Lists"
          columns={columns({
            onDelete: (id) => setListToDelete(id),
            onEdit: (list) => toggleEditDialog(list.id, true),
          })}
          data={lists ?? []}
          className="h-[calc(100vh-290px)]"
          isLoading={isLoading}
          NoResultsContent={
            <div className="flex flex-col items-center justify-center h-full my-10 gap-3">
              <p className="text-sm text-muted-foreground">No lists found.</p>
              <p className="text-xs text-muted-foreground">
                Create a new list to get started.
              </p>
              <Button onClick={() => setIsDialogOpen(true)}>
                Create a List <Plus className="ml-2 h-4 w-4" />
              </Button>
            </div>
          }
        />

        <div className="flex items-center justify-between">
          <div className="text-sm text-muted-foreground">
            {data?.pagination.total ?? 0} total lists
          </div>
          <Pagination
            page={pagination.page}
            totalPages={pagination.totalPages}
            onPageChange={(page) => setPagination("page", page)}
            hasNextPage={pagination.page < pagination.totalPages}
          />
        </div>
      </div>

      {/* Delete List Alert Dialog */}
      <AlertDialog
        open={!!listToDelete}
        onOpenChange={() => setListToDelete(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete the
              list and remove all subscriber associations.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <Button
              variant="destructive"
              onClick={() => {
                if (listToDelete) {
                  deleteList.mutate({ id: listToDelete })
                  setListToDelete(null)
                }
              }}
              disabled={deleteList.isPending}
            >
              {deleteList.isPending ? "Deleting..." : "Delete List"}
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Edit List Dialogs */}
      {lists?.map((list) => (
        <Dialog
          key={list.id}
          open={editDialogStates[list.id] ?? false}
          onOpenChange={(open) => toggleEditDialog(list.id, open)}
        >
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Edit List</DialogTitle>
            </DialogHeader>
            <UpdateListForm
              list={list}
              onSuccess={() => toggleEditDialog(list.id, false)}
            />
          </DialogContent>
        </Dialog>
      ))}
    </div>
  )
}
