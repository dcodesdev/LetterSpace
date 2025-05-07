import { Plus, Trash2 } from "lucide-react"
import {
  Button,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
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
import { addSubscriberSchema } from "./schemas"
import { trpc } from "@/trpc"
import { toast } from "sonner"
import { useSession } from "@/hooks"

interface AddSubscriberDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess: () => void
}

export function AddSubscriberDialog({
  open,
  onOpenChange,
  onSuccess,
}: AddSubscriberDialogProps) {
  const { organization } = useSession()
  const utils = trpc.useUtils()
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
      metadata: [],
    },
  })

  const {
    fields: metadataFields,
    append: appendMetadata,
    remove: removeMetadata,
  } = useFieldArray({
    control: form.control,
    name: "metadata",
  })

  const addSubscriber = trpc.subscriber.create.useMutation({
    onSuccess: () => {
      toast.success("Subscriber added successfully")
      onOpenChange(false)
      form.reset()
      utils.list.invalidate()
      utils.subscriber.invalidate()
      onSuccess()
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
                            const newValue = field.value?.includes(list.id)
                              ? field.value?.filter((id) => id !== list.id)
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
  )
}
