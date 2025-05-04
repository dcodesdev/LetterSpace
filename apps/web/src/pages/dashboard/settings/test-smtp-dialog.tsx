import { useState } from "react"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogTrigger,
  Button,
  Form,
  FormField,
  FormItem,
  FormLabel,
  FormControl,
  Input,
  FormMessage,
} from "@repo/ui"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { trpc } from "@/trpc"
import { toast } from "sonner"
import { useLocalStorage } from "usehooks-ts"

const testSchema = z.object({
  email: z.string().email("Please enter a valid email address"),
})

type TestSmtpDialogProps = {
  trigger: React.ReactNode
  organizationId: string
}

export function TestSmtpDialog({
  trigger,
  organizationId,
}: TestSmtpDialogProps) {
  const [open, setOpen] = useState(false)
  const [emailLocalStorage, setEmailLocalStorage] = useLocalStorage(
    "test-smtp-email",
    ""
  )

  const form = useForm<z.infer<typeof testSchema>>({
    resolver: zodResolver(testSchema),
    defaultValues: {
      email: emailLocalStorage,
    },
    mode: "onChange",
  })

  const testSmtp = trpc.settings.testSmtp.useMutation({
    onSuccess: () => {
      toast.success("Test email sent successfully")
      setOpen(false)
      form.reset()
    },
    onError: (error) => {
      toast.error(error.message)
    },
  })

  const onSubmit = (values: z.infer<typeof testSchema>) => {
    testSmtp.mutate({
      email: values.email,
      organizationId,
    })
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Test SMTP Settings</DialogTitle>
          <DialogDescription>
            Send a test email to verify your SMTP configuration
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Test Email</FormLabel>
                  <FormControl>
                    <Input
                      {...field}
                      placeholder="Enter email address"
                      type="email"
                      onChange={(e) => {
                        field.onChange(e)
                        setEmailLocalStorage(e.target.value)
                      }}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <div className="flex justify-end gap-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => setOpen(false)}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={testSmtp.isPending}>
                {testSmtp.isPending ? "Sending..." : "Send Test Email"}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}
