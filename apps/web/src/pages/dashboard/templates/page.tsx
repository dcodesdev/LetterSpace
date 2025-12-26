import { useEffect, useState } from "react"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  Button,
  DataTable,
} from "@repo/ui"
import { Plus } from "lucide-react"
import { toast } from "sonner"
import { Pagination } from "@/components"
import { usePaginationWithQueryState, useSession } from "@/hooks"
import { trpc } from "@/trpc"
import { columns } from "./columns"
import { CreateTemplateForm } from "./create-template-form"
import { TemplateSearch } from "./template-search"

export function TemplatesPage() {
  const [templateToDelete, setTemplateToDelete] = useState<string | null>(null)
  const { pagination, setPagination } = usePaginationWithQueryState()

  const { organization } = useSession()
  const utils = trpc.useUtils()

  const { data, isLoading } = trpc.template.list.useQuery(
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

  useEffect(() => {
    setPagination("totalPages", data?.pagination.totalPages)
  }, [data]) // eslint-disable-line react-hooks/exhaustive-deps

  const deleteTemplateMutation = trpc.template.delete.useMutation({
    onSuccess: () => {
      toast.success("Template deleted successfully")
      setTemplateToDelete(null)
      utils.template.list.invalidate()
    },
    onError: (error) => {
      toast.error(error.message)
    },
  })

  const handleDeleteTemplate = (id: string) => {
    if (!organization?.id) return

    deleteTemplateMutation.mutate({
      id,
      organizationId: organization.id,
    })
  }

  const templates = data?.templates ?? []

  return (
    <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
      <div className="flex items-center justify-between space-y-2">
        <h2 className="text-3xl font-bold tracking-tight">Email Templates</h2>
      </div>

      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex flex-1 items-center space-x-2">
            <TemplateSearch />
          </div>

          <div className="flex items-center space-x-2">
            {/* <Button variant="outline" size="icon">
              <Download className="h-4 w-4" />
            </Button> */}
            <CreateTemplateForm>
              <Button>
                <Plus className="mr-2 h-4 w-4" />
                Create Template
              </Button>
            </CreateTemplateForm>
          </div>
        </div>

        <DataTable
          title="Templates"
          columns={columns({
            onDelete: (id) => setTemplateToDelete(id),
            onDuplicate: () => toast.info("Duplicate coming soon"),
            organizationId: organization?.id ?? "",
          })}
          data={templates}
          className="h-[calc(100vh-290px)]"
          isLoading={isLoading}
          NoResultsContent={
            <div className="flex flex-col items-center justify-center h-full my-10 gap-3">
              <p className="text-sm text-muted-foreground">
                No templates found.
              </p>
              <p className="text-xs text-muted-foreground">
                Create a new template to get started.
              </p>
              <CreateTemplateForm>
                <Button>
                  <Plus className="mr-2 h-4 w-4" />
                  Create a Template
                </Button>
              </CreateTemplateForm>
            </div>
          }
        />

        <div className="flex items-center justify-between">
          <div className="flex-1 text-sm text-muted-foreground">
            {data?.pagination.total ?? 0} total templates
          </div>
          <Pagination
            page={pagination.page}
            totalPages={pagination.totalPages}
            onPageChange={(page) => setPagination("page", page)}
            hasNextPage={pagination.page < pagination.totalPages}
          />
        </div>
      </div>

      {/* Delete Template Alert Dialog */}
      <AlertDialog
        open={templateToDelete !== null}
        onOpenChange={(open) => !open && setTemplateToDelete(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete the
              template from our servers.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() =>
                templateToDelete && handleDeleteTemplate(templateToDelete)
              }
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
