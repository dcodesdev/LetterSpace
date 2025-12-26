import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import {
  Button,
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  Input,
  Textarea,
} from "@repo/ui"
import { Loader2 } from "lucide-react"
import { z } from "zod"
import { useSession } from "@/hooks"
import { trpc } from "@/trpc"

const formSchema = z.object({
  name: z.string().min(3, {
    message: "List name must be at least 3 characters.",
  }),
  description: z.string().optional(),
})

export function CreateListForm({ onSuccess }: { onSuccess: () => void }) {
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: "",
      description: "",
    },
  })

  const createList = trpc.list.create.useMutation()
  const { orgId } = useSession()
  const utils = trpc.useUtils()

  function onSubmit(values: z.infer<typeof formSchema>) {
    createList.mutate(
      {
        ...values,
        organizationId: orgId,
      },
      {
        onSuccess: () => {
          form.reset()
          onSuccess()
          utils.list.invalidate()
        },
      }
    )
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>List Name</FormLabel>
              <FormControl>
                <Input placeholder="My Awesome List" {...field} />
              </FormControl>
              <FormDescription>
                Choose a name for your new list.
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="description"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Description</FormLabel>
              <FormControl>
                <Textarea
                  placeholder="Describe the purpose of this list."
                  className="resize-none"
                  {...field}
                />
              </FormControl>
              <FormDescription>
                Provide a brief description of your list.
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />
        <Button type="submit" disabled={createList.isPending}>
          {createList.isPending && (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          )}
          Create List
        </Button>
      </form>
    </Form>
  )
}
