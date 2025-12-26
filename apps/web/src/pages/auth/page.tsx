"use client"

import { Card, CardDescription, CardHeader, CardTitle } from "@repo/ui"
import { Loader2 } from "lucide-react"
import { trpc } from "@/trpc"
import { Login } from "./login"
import { Signup } from "./signup"

export function AuthPage() {
  const { data: isFirstUser, isLoading } = trpc.user.isFirstUser.useQuery()

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-sm text-muted-foreground">Loading...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="flex items-center justify-center min-h-screen">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-1">
          <CardTitle className="text-2xl font-bold text-center">
            {isFirstUser ? "Create an account" : "Login"}
          </CardTitle>
          <CardDescription className="text-center">
            {isFirstUser
              ? "Enter your information to create your account"
              : "Enter your email and password to access your account"}
          </CardDescription>
        </CardHeader>

        {isFirstUser ? <Signup /> : <Login />}
      </Card>
    </div>
  )
}
