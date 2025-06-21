import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import {
  Form,
  FormField,
  FormItem,
  FormLabel,
  FormControl,
  Input,
  FormMessage,
  FormDescription,
  Switch,
  Button,
} from "@repo/ui"
import { MonacoEditor, WebhookEventsReference } from "@/components"

const webhookSchema = z.object({
  name: z.string().min(1, "Name is required"),
  isActive: z.boolean(),
  authCode: z.string().optional(),
  transformCode: z.string().optional(),
})

export type WebhookFormData = z.infer<typeof webhookSchema>

const DEFAULT_AUTH_CODE = `function authorize(headers, body, query, params) {
  // Return true to allow the request, false to deny
  
  // Example: Check for a specific header
  // const signature = headers['x-signature'];
  // return signature === 'expected-signature';
  
  return true;
}`

const DEFAULT_TRANSFORM_CODE = `function transform(payload, headers, query) {
  // Transform the webhook payload to LetterSpace format
  // Available variables: payload, headers, query
  // Must return an object with messageId, event, reason, and timestamp fields
  
  // Extract timestamp from payload, headers, or generate current timestamp
  const timestamp = payload.timestamp || 
                   payload.sent_at || 
                   payload.created_at || 
                   headers.date || 
                   headers.timestamp || 
                   new Date().toISOString();
  
  return {
    messageId: payload.messageId || payload.message_id,
    event: payload.event || payload.event_type,
    reason: payload.reason || payload.error_message,
    timestamp: timestamp
  };
}`

interface WebhookFormProps {
  onSubmit: (data: WebhookFormData) => void
  isLoading?: boolean
  defaultValues?: Partial<WebhookFormData>
  submitText?: string
  onCancel?: () => void
}

export function WebhookForm({
  onSubmit,
  isLoading = false,
  defaultValues,
  submitText = "Create",
  onCancel,
}: WebhookFormProps) {
  const form = useForm<WebhookFormData>({
    resolver: zodResolver(webhookSchema),
    defaultValues: {
      name: "",
      isActive: true,
      authCode: DEFAULT_AUTH_CODE,
      transformCode: DEFAULT_TRANSFORM_CODE,
      ...defaultValues,
    },
  })

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Name</FormLabel>
              <FormControl>
                <Input placeholder="My SMTP Webhook" {...field} />
              </FormControl>
              <FormDescription>
                A descriptive name for this webhook
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="authCode"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Authorization Code (Optional)</FormLabel>
              <FormControl>
                <MonacoEditor
                  value={field.value || ""}
                  onChange={field.onChange}
                  placeholder="JavaScript code to authorize webhook requests"
                  height={200}
                  language="javascript"
                />
              </FormControl>
              <FormDescription>
                JavaScript code to verify webhook authenticity. The
                authorize(headers, body, query, params) function should return
                true to allow the request.
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="transformCode"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Transform Code (Optional)</FormLabel>
              <FormControl>
                <MonacoEditor
                  value={field.value || ""}
                  onChange={field.onChange}
                  placeholder="JavaScript code to transform webhook payload"
                  height={200}
                  language="javascript"
                />
              </FormControl>
              <FormDescription>
                JavaScript code to transform the webhook payload to LetterSpace
                format. The transform(payload, headers, query) function must
                return an object with <code>messageId</code> and{" "}
                <code>event</code> fields. The event must be one of the accepted
                types shown above.
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        <WebhookEventsReference />

        <FormField
          control={form.control}
          name="isActive"
          render={({ field }) => (
            <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
              <div className="space-y-0.5">
                <FormLabel className="text-base">Active</FormLabel>
                <FormDescription>
                  Enable this webhook to receive events
                </FormDescription>
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

        <div className="flex justify-end gap-4">
          {onCancel && (
            <Button type="button" variant="outline" onClick={onCancel}>
              Cancel
            </Button>
          )}
          <Button type="submit" disabled={isLoading}>
            {submitText}
          </Button>
        </div>
      </form>
    </Form>
  )
}
