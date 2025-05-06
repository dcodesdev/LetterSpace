import {
  Button,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  Input,
  Switch,
} from "@repo/ui"
import { useForm, useFieldArray } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import * as z from "zod"
import { editSubscriberSchema } from "./schemas"
import { trpc } from "@/trpc"
import { toast } from "sonner"
import { useSession } from "@/hooks"
import { useEffect } from "react"
import { RouterOutput } from "@/types"
import { EditSubscriberDialogState } from "./types"
import { Plus, Trash2 } from "lucide-react"

interface EditSubscriberDialogProps extends EditSubscriberDialogState {
  onOpenChange: (open: boolean) => void
  lists: RouterOutput["list"]["list"] | undefined
}

export function EditSubscriberDialog({
  open,
  subscriber,
  onOpenChange,
  lists,
}: EditSubscriberDialogProps) {
  const { organization } = useSession()
  const utils = trpc.useUtils()

  const form = useForm<z.infer<typeof editSubscriberSchema>>({
    resolver: zodResolver(editSubscriberSchema),
    defaultValues: {
      email: "",
      name: "",
      listIds: [],
      emailVerified: false,
      metadata: [],
    },
  })

  const {
    fields: metadataFields,
    append: appendMetadata,
    remove: removeMetadata,
    replace: replaceMetadata,
  } = useFieldArray({
    control: form.control,
    name: "metadata",
  })

  useEffect(() => {
    if (subscriber) {
      form.reset({
        email: subscriber.email,
        name: subscriber.name ?? "",
        listIds: subscriber.ListSubscribers.map((ls) => ls.List.id),
        emailVerified: subscriber.emailVerified ?? false,
        metadata:
          subscriber.Metadata?.map((m) => ({ key: m.key, value: m.value })) ||
          [],
      })
      replaceMetadata(
        subscriber.Metadata?.map((m) => ({ key: m.key, value: m.value })) || []
      )
    } else {
      form.reset({
        email: "",
        name: "",
        listIds: [],
        emailVerified: false,
        metadata: [],
      })
      replaceMetadata([])
    }
  }, [subscriber, form, replaceMetadata])

  const updateSubscriber = trpc.subscriber.update.useMutation({
    onSuccess: () => {
      toast.success("Subscriber updated successfully")
      onOpenChange(false)
      form.reset()
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
    if (!subscriber || !organization?.id) return

    updateSubscriber.mutate({
      id: subscriber.id,
      organizationId: organization.id,
      ...values,
    })
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(isOpen) => {
        onOpenChange(isOpen)
        if (!isOpen) {
          form.reset()
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
        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleEditSubscriber)}>
            <div className="grid gap-4 py-4">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Name</FormLabel>
                    <FormControl>
                      <Input placeholder="Enter subscriber's name" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
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
                control={form.control}
                name="listIds"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Lists</FormLabel>
                    <div className="flex flex-wrap gap-2">
                      {lists?.lists.map((list) => (
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
                      {lists?.lists.length === 0 && (
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
              <div>
                <FormLabel className="text-base">Metadata</FormLabel>
                {metadataFields.length > 0 ? (
                  <>
                    {metadataFields.map((field, index) => (
                      <div
                        key={field.id}
                        className="flex items-center gap-2 mt-2"
                      >
                        <FormField
                          control={form.control}
                          name={`metadata.${index}.key`}
                          render={({ field: keyField }) => (
                            <FormItem className="flex-1">
                              <FormControl>
                                <Input placeholder="Key" {...keyField} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={form.control}
                          name={`metadata.${index}.value`}
                          render={({ field: valueField }) => (
                            <FormItem className="flex-1">
                              <FormControl>
                                <Input placeholder="Value" {...valueField} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          onClick={() => removeMetadata(index)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    ))}
                  </>
                ) : (
                  <div className="flex flex-col mt-2 mb-2 border rounded-md p-4">
                    <p className="text-sm text-muted-foreground mb-2">
                      No metadata added yet
                    </p>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => appendMetadata({ key: "", value: "" })}
                    >
                      <Plus className="h-4 w-4 mr-2" />
                      Add Metadata
                    </Button>
                  </div>
                )}
                {metadataFields.length > 0 && (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="mt-2"
                    onClick={() => appendMetadata({ key: "", value: "" })}
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Add Metadata
                  </Button>
                )}
              </div>
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
  )
}
