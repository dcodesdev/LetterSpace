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
import { Eye, EyeOff, Mail, User } from "lucide-react"
import { Input } from "@repo/ui"
import { useState } from "react"

const signUpSchema = z.object({
  name: z.string().min(2),
  email: z.string().email(),
  password: z.string().min(8),
})

export const Signup = () => {
  const [showPassword, setShowPassword] = useState(false)
  const navigate = useNavigate()
  const signupForm = useForm<z.infer<typeof signUpSchema>>({
    resolver: zodResolver(signUpSchema),
    defaultValues: {
      name: "",
      email: "",
      password: "",
    },
  })
  const signup = trpc.user.signup.useMutation()
  function onSignupSubmit(values: z.infer<typeof signUpSchema>) {
    signup.mutate(values, {
      onSuccess(data) {
        Cookies.set("token", data.token)
        navigate("/onboarding")
      },
    })
  }

  return (
    <Form {...signupForm}>
      <form
        onSubmit={signupForm.handleSubmit(onSignupSubmit)}
        className="space-y-4"
      >
        <CardContent className="space-y-4">
          <FormField
            control={signupForm.control}
            name="name"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Full Name</FormLabel>
                <div className="relative">
                  <User className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <FormControl>
                    <Input
                      {...field}
                      placeholder="John Doe"
                      className="pl-10"
                    />
                  </FormControl>
                </div>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={signupForm.control}
            name="email"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Email</FormLabel>
                <div className="relative">
                  <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <FormControl>
                    <Input
                      {...field}
                      placeholder="john@example.com"
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
            control={signupForm.control}
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
        <CardFooter className="flex flex-col space-y-4">
          <Button
            type="submit"
            className="w-full"
            loading={signup.isPending}
            disabled={signup.isPending}
          >
            Create account
          </Button>
        </CardFooter>
      </form>
    </Form>
  )
}
