import { useState } from "react"
import {
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  FormControl,
  FormField,
  FormItem,
  FormMessage,
  Textarea,
} from "@repo/ui"
import { Dialog, DialogContent, DialogTitle, DialogTrigger } from "@repo/ui"
import { Eye, Link2, Wand2 } from "lucide-react"
import { EmailPreview } from "@/components"
import { useSession } from "@/hooks"
import { trpc } from "@/trpc"
import { useCampaignContext } from "../../useCampaignContext"

export const EditorTab = () => {
  const [previewOpen, setPreviewOpen] = useState(false)
  const { organization } = useSession()

  const { form, isEditable } = useCampaignContext()

  const content = form.watch("content")
  const templateId = form.watch("templateId")

  const { data: template } = trpc.template.get.useQuery(
    {
      id: templateId ?? "",
      organizationId: organization?.id ?? "",
    },
    {
      enabled: !!templateId && !!organization?.id && previewOpen,
    }
  )

  let previewContent = content ?? "<p>No content available.</p>"
  if (previewOpen && template?.content && content) {
    previewContent = template.content.replace("{{content}}", content)
  } else if (previewOpen && template?.content && !content) {
    previewContent = template.content.replace(
      "{{content}}",
      "<p>No campaign content entered yet. This is where it will appear.</p>"
    )
  }

  const handleInsertUnsubscribeLink = () => {
    const textarea = document.querySelector(
      'textarea[name="content"]'
    ) as HTMLTextAreaElement
    if (!textarea) return

    const { selectionStart, selectionEnd } = textarea
    const currentContent = textarea.value
    const newContent =
      currentContent.slice(0, selectionStart) +
      "{{unsubscribe_link}}" +
      currentContent.slice(selectionEnd)

    form.setValue("content", newContent)
    textarea.focus()
    textarea.setSelectionRange(
      selectionStart + "{{unsubscribe_link}}".length,
      selectionStart + "{{unsubscribe_link}}".length
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Email Content</CardTitle>
        <CardDescription>
          Edit your email content using either the rich text editor or plain
          text
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex justify-between items-center mb-4">
          <div className="flex items-center gap-2">
            <Dialog open={previewOpen} onOpenChange={setPreviewOpen}>
              <DialogTrigger asChild>
                <Button type="button" variant="outline">
                  <Eye className="w-4 h-4 mr-2" />
                  Preview
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-[900px] w-[90vw] p-4">
                <div className="flex flex-col gap-4">
                  <div className="flex items-center justify-between border-b pb-4">
                    <DialogTitle className="text-lg font-semibold">
                      Email Preview
                    </DialogTitle>
                  </div>
                  <div className="relative min-h-[70vh] max-h-[80vh] overflow-y-auto scroll-hidden">
                    {previewOpen && (templateId ? template : true) ? (
                      <EmailPreview
                        content={previewContent}
                        className="h-full cursor-default rounded-md bg-white scroll-hidden"
                      />
                    ) : previewOpen && templateId && !template ? (
                      <div className="flex items-center justify-center h-full">
                        <p className="text-muted-foreground">
                          Loading template...
                        </p>
                      </div>
                    ) : (
                      <div className="flex items-center justify-center h-full">
                        <p className="text-muted-foreground">
                          No content to preview. Select a template if you wish
                          to see it populated.
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              </DialogContent>
            </Dialog>
            <Button
              type="button"
              variant="outline"
              onClick={handleInsertUnsubscribeLink}
              disabled={!isEditable}
            >
              <Link2 className="w-4 h-4 mr-2" />
              Insert Unsubscribe Link
            </Button>
            <div className="flex items-center gap-2 bg-muted/50 px-3 py-1.5 rounded-md text-sm text-muted-foreground">
              <Wand2 className="w-4 h-4" />
              Rich text editor coming soon
            </div>
          </div>
        </div>

        <FormField
          control={form.control}
          name="content"
          render={({ field }) => (
            <FormItem>
              <FormControl>
                <Textarea
                  placeholder="Enter plain text content here..."
                  className="min-h-[400px] font-mono mt-4"
                  {...field}
                  disabled={!isEditable}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
      </CardContent>
    </Card>
  )
}
