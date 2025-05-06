import { ArrowDown, ArrowUp, Plus, Users, Trash } from "lucide-react"
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
import {
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Input,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogFooter,
  AlertDialogDescription,
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  Switch,
} from "@repo/ui"
import { columns } from "./columns"
import { toast } from "sonner"
import { useState, useEffect } from "react"
import { trpc } from "@/trpc"
import { useSession, usePaginationWithQueryState } from "@/hooks"
import { zodResolver } from "@hookform/resolvers/zod"
import { useForm } from "react-hook-form"
import * as z from "zod"
import { ListSubscriber, Subscriber } from "backend"
import { CardSkeleton } from "@/components"
import { DataTable } from "@repo/ui"
import { Pagination } from "@/components"
import { SubscriberSearch } from "./subscriber-search"

const addSubscriberSchema = z.object({
  email: z.string().email({
    message: "Please enter a valid email address.",
  }),
  name: z.string().optional(),
  listIds: z.array(z.string()),
  emailVerified: z.boolean().optional(),
})

export type PopulatedSubscriber = Subscriber & {
  ListSubscribers: (ListSubscriber & {
    List: {
      id: string
      name: string
    }
  })[]
}

interface EditSubscriberDialogState {
  open: boolean
  subscriber: PopulatedSubscriber | null
}

const editSubscriberSchema = z.object({
  email: z.string().email({
    message: "Please enter a valid email address.",
  }),
  name: z.string().optional(),
  listIds: z.array(z.string()),
  emailVerified: z.boolean().optional(),
})

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
  const { pagination, setPagination } = usePaginationWithQueryState()

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

  const editForm = useForm<z.infer<typeof editSubscriberSchema>>({
    resolver: zodResolver(editSubscriberSchema),
    defaultValues: {
      email: "",
      name: "",
      listIds: [],
      emailVerified: false,
    },
  })

  // Reset form when subscriber changes
  useEffect(() => {
    if (editDialog.subscriber) {
      editForm.reset({
        email: editDialog.subscriber.email,
        name: editDialog.subscriber.name ?? "",
        listIds: editDialog.subscriber.ListSubscribers.map((ls) => ls.List.id),
        emailVerified: editDialog.subscriber.emailVerified ?? false,
      })
    }
  }, [editDialog.subscriber, editForm])

  const updateSubscriber = trpc.subscriber.update.useMutation({
    onSuccess: () => {
      toast.success("Subscriber updated successfully")
      setEditDialog({ open: false, subscriber: null })
      editForm.reset()
      utils.list.invalidate()
      utils.subscriber.invalidate()
    },
    onError: (error) => {
      toast.error(error.message)
    },
  })

  const handleEditSubscriber = (
    values: z.infer<typeof editSubscriberSchema>
  ) => {
    if (!editDialog.subscriber || !organization?.id) return

    updateSubscriber.mutate({
      id: editDialog.subscriber.id,
      organizationId: organization.id,
      ...values,
    })
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

  const form = useForm<z.infer<typeof addSubscriberSchema>>({
    resolver: zodResolver(addSubscriberSchema),
    defaultValues: {
      email: "",
      name: "",
      listIds: [],
      emailVerified: false,
    },
  })

  const addSubscriber = trpc.subscriber.create.useMutation({
    onSuccess: () => {
      toast.success("Subscriber added successfully")
      setIsAddingSubscriber(false)
      form.reset()
      utils.list.invalidate()
      utils.subscriber.invalidate()
    },
    onError: (error) => {
      toast.error(error.message)
    },
  })

  const handleAddSubscriber = (values: z.infer<typeof addSubscriberSchema>) => {
    addSubscriber.mutate({
      ...values,
      organizationId: organization?.id ?? "",
    })
  }

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
      <div className="grid gap-4 md:grid-cols-3">
        <Card hoverEffect>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Active Subscribers
            </CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {analyticsLoading || !analytics ? (
              <CardSkeleton />
            ) : (
              <>
                <div className="text-2xl font-bold">
                  {analytics.subscribers.allTime.toLocaleString()}
                </div>
                <p className="text-xs text-muted-foreground inline-flex items-center gap-1">
                  <span className="text-emerald-500 inline-flex items-center">
                    <ArrowUp className="mr-1 h-4 w-4" />+
                    {analytics.subscribers.newThisMonth.toLocaleString()}
                  </span>{" "}
                  this month
                </p>
              </>
            )}
          </CardContent>
        </Card>
        <Card hoverEffect>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Average Open Rate{" "}
              <small className="text-xs text-muted-foreground">
                (Last 30 days)
              </small>
            </CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {analyticsLoading || !analytics ? (
              <CardSkeleton />
            ) : (
              <>
                <div className="text-2xl font-bold">
                  {analytics.openRate.thisMonth.toFixed(1)}%
                </div>
                <p className="text-xs text-muted-foreground inline-flex items-center gap-1">
                  {analytics.openRate.comparison >= 0 ? (
                    <span className="text-emerald-500 inline-flex items-center">
                      <ArrowUp className="mr-1 h-4 w-4" />+
                      {analytics.openRate.comparison.toFixed(1)}%
                    </span>
                  ) : (
                    <span className="text-rose-500 inline-flex items-center">
                      <ArrowDown className="mr-1 h-4 w-4" />
                      {analytics.openRate.comparison.toFixed(1)}%
                    </span>
                  )}{" "}
                  vs last month
                </p>
              </>
            )}
          </CardContent>
        </Card>
        <Card hoverEffect>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Unsubscribed{" "}
              <small className="text-xs text-muted-foreground">
                (Last 30 days)
              </small>
            </CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {analyticsLoading || !analytics ? (
              <CardSkeleton />
            ) : (
              <>
                <div className="text-2xl font-bold">
                  {analytics.unsubscribed.thisMonth.toLocaleString()}
                </div>
                <p className="text-xs text-muted-foreground inline-flex items-center gap-1">
                  {analytics.unsubscribed.comparison <= 0 ? (
                    <span className="text-emerald-500 inline-flex items-center">
                      <ArrowDown className="mr-1 h-4 w-4" />-
                      {Math.abs(analytics.unsubscribed.comparison)}
                    </span>
                  ) : (
                    <span className="text-rose-500 inline-flex items-center">
                      <ArrowUp className="mr-1 h-4 w-4" />+
                      {Math.abs(analytics.unsubscribed.comparison)}
                    </span>
                  )}{" "}
                  vs last month
                </p>
              </>
            )}
          </CardContent>
        </Card>
      </div>

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
            <Dialog
              open={isAddingSubscriber}
              onOpenChange={(open) => {
                setIsAddingSubscriber(open)
                if (!open) {
                  form.reset()
                }
              }}
            >
              <DialogTrigger asChild>
                <Button>
                  <Plus className="h-4 w-4" />
                  Add Subscriber
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Add New Subscriber</DialogTitle>
                  <DialogDescription>
                    Add a new subscriber to your newsletter list.
                  </DialogDescription>
                </DialogHeader>
                <Form {...form}>
                  <form
                    onSubmit={form.handleSubmit(handleAddSubscriber)}
                    className="space-y-4"
                  >
                    <FormField
                      control={form.control}
                      name="email"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Email</FormLabel>
                          <FormControl>
                            <Input placeholder="Enter email" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="name"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Name</FormLabel>
                          <FormControl>
                            <Input placeholder="Enter name" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="listIds"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Lists</FormLabel>
                          <FormControl>
                            <div className="grid grid-cols-2 gap-2">
                              {lists.data?.lists.map((list) => (
                                <Button
                                  key={list.id}
                                  type="button"
                                  variant={
                                    field.value?.includes(list.id)
                                      ? "default"
                                      : "outline"
                                  }
                                  onClick={() => {
                                    const newValue = field.value?.includes(
                                      list.id
                                    )
                                      ? field.value?.filter(
                                          (id) => id !== list.id
                                        )
                                      : [...(field.value ?? []), list.id]
                                    field.onChange(newValue)
                                  }}
                                >
                                  {list.name}
                                </Button>
                              ))}
                            </div>
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="emailVerified"
                      render={({ field }) => (
                        <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3 shadow-sm">
                          <div className="space-y-0.5">
                            <FormLabel>Email Verified</FormLabel>
                            <FormMessage />
                          </div>
                          <FormControl>
                            <Switch
                              checked={field.value}
                              onCheckedChange={field.onChange}
                            />
                          </FormControl>
                        </FormItem>
                      )}
                    />
                    <DialogFooter>
                      <Button
                        loading={addSubscriber.isPending}
                        type="submit"
                        disabled={addSubscriber.isPending}
                      >
                        Add Subscriber
                      </Button>
                    </DialogFooter>
                  </form>
                </Form>
              </DialogContent>
            </Dialog>

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
      <AlertDialog
        open={subscriberToDelete !== null}
        onOpenChange={(open) => !open && setSubscriberToDelete(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
            <AlertDialogDescription>
              {subscriberToDelete?.includes(",")
                ? `This action cannot be undone. This will permanently delete ${subscriberToDelete.split(",").length} subscribers and remove their data from our servers.`
                : "This action cannot be undone. This will permanently delete the subscriber and remove their data from our servers."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteSubscriber}
              disabled={deleteSubscriber.isPending}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleteSubscriber.isPending
                ? "Deleting..."
                : subscriberToDelete?.includes(",")
                  ? `Delete ${subscriberToDelete.split(",").length} subscribers`
                  : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Edit Subscriber Dialog */}
      <Dialog
        open={editDialog.open}
        onOpenChange={(open) => {
          setEditDialog((prev) => ({ ...prev, open }))
          if (!open) {
            editForm.reset()
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Subscriber</DialogTitle>
            <DialogDescription>
              Update subscriber details and list assignments.
            </DialogDescription>
          </DialogHeader>
          <Form {...editForm}>
            <form onSubmit={editForm.handleSubmit(handleEditSubscriber)}>
              <div className="grid gap-4 py-4">
                <FormField
                  control={editForm.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Name</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="Enter subscriber's name"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={editForm.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Email</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="Enter subscriber's email"
                          type="email"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={editForm.control}
                  name="listIds"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Lists</FormLabel>
                      <div className="flex flex-wrap gap-2">
                        {lists.data?.lists.map((list) => (
                          <Button
                            key={list.id}
                            type="button"
                            size="sm"
                            variant={
                              field.value.includes(list.id)
                                ? "default"
                                : "outline"
                            }
                            onClick={() => {
                              const newValue = field.value.includes(list.id)
                                ? field.value.filter((id) => id !== list.id)
                                : [...field.value, list.id]
                              field.onChange(newValue)
                            }}
                            className="h-8"
                          >
                            {list.name}
                            {field.value.includes(list.id) && (
                              <span className="ml-1">✓</span>
                            )}
                          </Button>
                        ))}
                        {lists.data?.lists.length === 0 && (
                          <p className="text-sm text-muted-foreground">
                            No lists available. Create a list first.
                          </p>
                        )}
                      </div>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={editForm.control}
                  name="emailVerified"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3 shadow-sm">
                      <div className="space-y-0.5">
                        <FormLabel>Email Verified</FormLabel>
                        <FormMessage />
                      </div>
                      <FormControl>
                        <Switch
                          checked={field.value}
                          onCheckedChange={field.onChange}
                        />
                      </FormControl>
                    </FormItem>
                  )}
                />
              </div>
              <DialogFooter>
                <Button type="submit" disabled={updateSubscriber.isPending}>
                  {updateSubscriber.isPending
                    ? "Updating..."
                    : "Update Subscriber"}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
