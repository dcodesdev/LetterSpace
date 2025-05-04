import { zodResolver } from "@hookform/resolvers/zod"
import { useForm } from "react-hook-form"
import * as z from "zod"
import {
  Button,
  DialogFooter,
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
import { Template } from "backend"

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

export type UpdateTemplateFormData = z.infer<typeof templateSchema>

interface UpdateTemplateFormProps {
  template: Template
  onSubmit: (data: UpdateTemplateFormData) => void
  isSubmitting?: boolean
}

export function UpdateTemplateForm({
  template,
  onSubmit,
  isSubmitting = false,
}: UpdateTemplateFormProps) {
  const form = useForm<UpdateTemplateFormData>({
    resolver: zodResolver(templateSchema),
    defaultValues: {
      name: template.name,
      description: template.description ?? "",
      content: template.content,
    },
  })

  const insertContentPlaceholder = () => {
    const textarea = document.getElementById("content") as HTMLTextAreaElement
    if (!textarea) return

    const cursorPos = textarea.selectionStart
    const textBefore = textarea.value.substring(0, cursorPos)
    const textAfter = textarea.value.substring(cursorPos)

    const newValue = `${textBefore}{{CONTENT}}${textAfter}`
    form.setValue("content", newValue)

    setTimeout(() => {
      textarea.focus()
      const newCursorPos = cursorPos + 11
      textarea.setSelectionRange(newCursorPos, newCursorPos)
    }, 0)
  }

  return (
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
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? "Updating..." : "Update Template"}
          </Button>
        </DialogFooter>
      </form>
    </Form>
  )
}
