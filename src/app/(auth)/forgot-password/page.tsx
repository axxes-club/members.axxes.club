"use client"

import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { ArrowLeft, Mail } from "lucide-react"

export default function ForgotPasswordPage() {
  return (
    <div className="space-y-6">
      <div className="space-y-2 text-center">
        <h1 className="text-display-sm">Reset password</h1>
        <p className="text-body-md text-muted-foreground">
          Need help accessing your account?
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Forgot Password</CardTitle>
          <CardDescription>
            Password reset is coming soon
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-col items-center gap-3 py-4 text-center">
            <Mail className="h-12 w-12 text-muted-foreground" />
            <p className="text-sm text-muted-foreground">
              For now, please contact support to reset your password.
            </p>
            <a
              href="mailto:support@axxes.club"
              className="text-primary hover:underline"
            >
              support@axxes.club
            </a>
          </div>

          <Link href="/sign-in">
            <Button variant="outline" className="w-full">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Sign In
            </Button>
          </Link>
        </CardContent>
      </Card>
    </div>
  )
}
