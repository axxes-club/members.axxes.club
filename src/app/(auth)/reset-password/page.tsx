"use client"

import { Suspense, useState } from "react"
import { useSearchParams } from "next/navigation"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { resetPassword } from "@/lib/actions/auth"
import { CheckCircle } from "lucide-react"

function ResetPasswordForm() {
  const searchParams = useSearchParams()
  const token = searchParams.get("token")

  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setIsLoading(true)
    setError(null)

    const formData = new FormData(e.currentTarget)
    const newPassword = formData.get("password") as string
    const confirmPassword = formData.get("confirmPassword") as string

    if (newPassword !== confirmPassword) {
      setError("Passwords do not match")
      setIsLoading(false)
      return
    }

    if (newPassword.length < 8) {
      setError("Password must be at least 8 characters")
      setIsLoading(false)
      return
    }

    if (!token) {
      setError("Invalid or missing reset token")
      setIsLoading(false)
      return
    }

    const result = await resetPassword(token, newPassword)

    if (result.success) {
      setSuccess(true)
    } else {
      setError(result.error || "Failed to reset password")
    }

    setIsLoading(false)
  }

  if (!token) {
    return (
      <Card>
        <CardContent className="py-8">
          <div className="text-center space-y-4">
            <p className="text-destructive">Invalid or expired reset link.</p>
            <Link href="/forgot-password">
              <Button variant="outline">Request New Link</Button>
            </Link>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Set New Password</CardTitle>
        <CardDescription>
          Enter your new password below
        </CardDescription>
      </CardHeader>
      <CardContent>
        {success ? (
          <div className="space-y-4">
            <div className="flex flex-col items-center gap-3 py-4 text-center">
              <CheckCircle className="h-12 w-12 text-green-500" />
              <p className="font-medium">Password reset successful!</p>
              <p className="text-sm text-muted-foreground">
                You can now sign in with your new password.
              </p>
            </div>
            <Link href="/sign-in">
              <Button className="w-full">Sign In</Button>
            </Link>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
                {error}
              </div>
            )}
            <div className="space-y-2">
              <Label htmlFor="password">New Password</Label>
              <Input
                id="password"
                name="password"
                type="password"
                placeholder="Enter new password"
                required
                minLength={8}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="confirmPassword">Confirm Password</Label>
              <Input
                id="confirmPassword"
                name="confirmPassword"
                type="password"
                placeholder="Confirm new password"
                required
                minLength={8}
              />
            </div>
            <Button type="submit" className="w-full" disabled={isLoading}>
              {isLoading ? "Resetting..." : "Reset Password"}
            </Button>
          </form>
        )}
      </CardContent>
    </Card>
  )
}

export default function ResetPasswordPage() {
  return (
    <div className="space-y-6">
      <div className="space-y-2 text-center">
        <h1 className="text-display-sm">Reset password</h1>
        <p className="text-body-md text-muted-foreground">
          Create a new password for your account
        </p>
      </div>

      <Suspense fallback={<div className="h-64 animate-pulse bg-muted rounded-lg" />}>
        <ResetPasswordForm />
      </Suspense>
    </div>
  )
}
