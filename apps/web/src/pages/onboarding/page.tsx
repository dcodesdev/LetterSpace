import {
  Form,
  FormField,
  FormItem,
  FormLabel,
  FormControl,
  FormDescription,
  FormMessage,
  Input,
  Button,
  Textarea,
} from "@repo/ui"
import { zodResolver } from "@hookform/resolvers/zod"
import { Building2Icon } from "lucide-react"
import { useForm } from "react-hook-form"
import { z } from "zod"
import { trpc } from "@/trpc"
import { useNavigate } from "react-router"
import { useLocalStorage } from "usehooks-ts"

const formSchema = z.object({
  name: z
    .string()
    .min(2, { message: "Organization name must be at least 2 characters" })
    .max(50, { message: "Organization name must be less than 50 characters" }),
  description: z.string().optional(),
})

export function OnboardingPage() {
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: "",
      description: "",
    },
  })

  const [, setOrgId] = useLocalStorage("orgId", "")
  const navigate = useNavigate()

  const createOrganization = trpc.organization.create.useMutation()

  function onSubmit(values: z.infer<typeof formSchema>) {
    createOrganization.mutate(values, {
      onSuccess: (data) => {
        setOrgId(data.organization.id)
        navigate("/dashboard")
      },
    })
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-md space-y-8">
        <div className="space-y-2 text-center">
          <div className="inline-block p-3 rounded-full bg-primary/10 mb-3">
            <Building2Icon className="h-10 w-10 text-primary" />
          </div>
          <h1 className="text-3xl font-bold tracking-tight">
            Create your organization
          </h1>
          <p className="text-muted-foreground">
            Get started by creating your first organization.
          </p>
        </div>

        <div className="space-y-6 bg-card p-6 rounded-lg border">
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Organization name</FormLabel>
                    <FormControl>
                      <Input placeholder="Acme Inc." {...field} />
                    </FormControl>
                    <FormDescription>
                      This is your organization&apos;s visible name.
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
                        placeholder="Tell us a little bit about your organization..."
                        className="resize-none"
                        {...field}
                      />
                    </FormControl>
                    <FormDescription>
                      A brief description of your organization&apos;s purpose.
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <Button type="submit" className="w-full">
                Create Organization
              </Button>
            </form>
          </Form>
        </div>
      </div>
    </div>
  )
}
