import {
  Form,
  FormField,
  FormItem,
  FormLabel,
  FormControl,
  FormMessage,
  CardContent,
  CardFooter,
  Button,
} from "@repo/ui"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { trpc } from "@/trpc"
import Cookies from "js-cookie"
import { useNavigate } from "react-router"
import { useLocalStorage } from "usehooks-ts"
import { Eye, EyeOff, Mail, Loader2 } from "lucide-react"
import { Input } from "@repo/ui"
import { useEffect, useState } from "react"
import { useSession } from "@/hooks/useSession"

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
})

export const Login = () => {
  const [showPassword, setShowPassword] = useState(false)
  const { user } = useSession()
  const navigate = useNavigate()

  useEffect(() => {
    if (user.data) {
      navigate("/dashboard", { replace: true })
    }
  }, [user.data, navigate])

  const loginForm = useForm<z.infer<typeof loginSchema>>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: "",
      password: "",
    },
  })

  const login = trpc.user.login.useMutation()
  const [, setOrgId] = useLocalStorage("orgId", "")

  function onLoginSubmit(values: z.infer<typeof loginSchema>) {
    login.mutate(values, {
      onSuccess: (data) => {
        Cookies.set("token", data.token)
        if (data.user.UserOrganizations[0]) {
          setOrgId(data.user.UserOrganizations[0].organizationId)
          navigate("/dashboard")
        } else {
          navigate("/onboarding")
        }
      },
      onError(error) {
        loginForm.setError("root", { message: error.message })
      },
    })
  }

  if (user.isLoading) {
    return (
      <div className="flex items-center justify-center p-10">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  if (user.data) {
    return null
  }

  return (
    <Form {...loginForm}>
      <form
        onSubmit={loginForm.handleSubmit(onLoginSubmit)}
        className="space-y-4"
      >
        <CardContent className="space-y-4">
          {loginForm.formState.errors.root && (
            <div className="text-sm text-destructive">
              {loginForm.formState.errors.root.message}
            </div>
          )}
          <FormField
            control={loginForm.control}
            name="email"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Email</FormLabel>
                <div className="relative">
                  <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <FormControl>
                    <Input
                      {...field}
                      placeholder="m@example.com"
                      type="email"
                      className="pl-10"
                    />
                  </FormControl>
                </div>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={loginForm.control}
            name="password"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Password</FormLabel>
                <div className="relative">
                  <FormControl>
                    <Input
                      {...field}
                      type={showPassword ? "text" : "password"}
                      className="pr-10"
                    />
                  </FormControl>
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-3 text-muted-foreground"
                  >
                    {showPassword ? (
                      <EyeOff className="h-4 w-4" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}
                  </button>
                </div>
                <FormMessage />
              </FormItem>
            )}
          />
        </CardContent>
        <CardFooter>
          <Button
            type="submit"
            className="w-full"
            loading={login.isPending}
            disabled={login.isPending}
          >
            Login
          </Button>
        </CardFooter>
      </form>
    </Form>
  )
}
