import { zodResolver } from "@hookform/resolvers/zod"
import { useForm } from "react-hook-form"
import * as z from "zod"
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
  Textarea,
} from "@repo/ui"
import { TextCursor } from "lucide-react"
import { trpc } from "@/trpc"
import { toast } from "sonner"
import { useSession } from "@/hooks"
import { useState } from "react"

const templateSchema = z.object({
  name: z.string().min(1, "Name is required"),
  description: z.string().optional(),
  content: z
    .string()
    .min(1, "HTML content is required")
    .refine(
      (content) => content.includes("{{CONTENT}}"),
      "Content must include the {{CONTENT}} placeholder"
    ),
})

export type CreateTemplateFormData = z.infer<typeof templateSchema>

interface CreateTemplateFormProps {
  children: React.ReactNode
}

export function CreateTemplateForm({ children }: CreateTemplateFormProps) {
  const form = useForm<CreateTemplateFormData>({
    resolver: zodResolver(templateSchema),
    defaultValues: {
      name: "",
      description: "",
      content: "",
    },
  })
  const { orgId } = useSession()
  const [isDialogOpen, setIsDialogOpen] = useState(false)

  const insertContentPlaceholder = () => {
    const textarea = document.getElementById("content") as HTMLTextAreaElement
    if (!textarea) return

    const cursorPos = textarea.selectionStart
    const textBefore = textarea.value.substring(0, cursorPos)
    const textAfter = textarea.value.substring(cursorPos)

    const newValue = `${textBefore}{{CONTENT}}${textAfter}`
    form.setValue("content", newValue)

    // Reset cursor position after the placeholder
    setTimeout(() => {
      textarea.focus()
      const newCursorPos = cursorPos + 11 // length of "{{CONTENT}}"
      textarea.setSelectionRange(newCursorPos, newCursorPos)
    }, 0)
  }

  const utils = trpc.useUtils()

  const createTemplateMutation = trpc.template.create.useMutation({
    onSuccess: () => {
      toast.success("Template created successfully")
      setIsDialogOpen(false)
      form.reset()
      utils.template.invalidate()
    },
    onError: (error) => {
      toast.error(error.message)
    },
  })

  const onSubmit = (data: CreateTemplateFormData) => {
    if (!orgId) return

    createTemplateMutation.mutate({
      ...data,
      organizationId: orgId,
      description: data.description || null,
    })
  }

  return (
    <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="sm:max-w-[625px]">
        <DialogHeader>
          <DialogTitle>Create New Template</DialogTitle>
          <DialogDescription>
            Create a new email template for your campaigns.
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)}>
            <div className="grid gap-4 py-4">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Name</FormLabel>
                    <FormControl>
                      <Input placeholder="Enter template name" {...field} />
                    </FormControl>
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
                        placeholder="Enter template description"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="content"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>HTML Content</FormLabel>
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={insertContentPlaceholder}
                        >
                          <TextCursor className="mr-2 h-4 w-4" />
                          Insert Content Placeholder
                        </Button>
                      </div>
                      <FormControl>
                        <Textarea
                          id="content"
                          placeholder="Enter HTML content"
                          className="min-h-[200px] font-mono"
                          {...field}
                        />
                      </FormControl>
                    </div>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            <DialogFooter>
              <Button type="submit" disabled={createTemplateMutation.isPending}>
                {createTemplateMutation.isPending
                  ? "Creating..."
                  : "Create Template"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}
