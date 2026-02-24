"use client"

import { useEffect, useState, useTransition } from "react"
import { useSearchParams, useRouter } from "next/navigation"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { CheckCircle2, XCircle, Clock, Users, Loader2 } from "lucide-react"
import { getInvitationByToken, acceptInvitation } from "@/lib/actions/settings"
import { useSession } from "@/lib/auth/client"

type InvitationData = {
  id: string
  email: string
  role: string
  status: string
  expiresAt: Date
  tenantName: string
  invitedByName: string
} | null

export function AcceptInviteContent() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const token = searchParams.get("token")
  const { data: session, isPending: sessionLoading } = useSession()

  const [invitation, setInvitation] = useState<InvitationData>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const [isPending, startTransition] = useTransition()

  useEffect(() => {
    async function loadInvitation() {
      if (!token) {
        setError("Invalid invitation link")
        setLoading(false)
        return
      }

      try {
        const data = await getInvitationByToken(token)
        if (!data) {
          setError("Invitation not found or has been revoked")
        } else if (data.status !== "pending") {
          setError(`This invitation has already been ${data.status}`)
        } else if (new Date(data.expiresAt) < new Date()) {
          setError("This invitation has expired")
        } else {
          setInvitation(data)
        }
      } catch {
        setError("Failed to load invitation")
      } finally {
        setLoading(false)
      }
    }

    loadInvitation()
  }, [token])

  const handleAccept = () => {
    if (!token) return

    startTransition(async () => {
      try {
        const result = await acceptInvitation(token)
        setSuccess(true)

        // Set the tenant cookie and redirect
        document.cookie = `tenant_id=${result.tenantId}; path=/; max-age=31536000`

        setTimeout(() => {
          router.push("/dashboard")
        }, 2000)
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to accept invitation")
      }
    })
  }

  if (loading || sessionLoading) {
    return (
      <div className="text-center">
        <Loader2 className="h-8 w-8 animate-spin mx-auto text-club" />
        <p className="mt-4 text-muted-foreground">Loading invitation...</p>
      </div>
    )
  }

  if (error) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="text-center">
            <XCircle className="h-12 w-12 text-red-500 mx-auto" />
            <h2 className="mt-4 text-xl font-semibold">Invalid Invitation</h2>
            <p className="mt-2 text-muted-foreground">{error}</p>
            <div className="mt-6 space-y-2">
              <Button asChild className="w-full">
                <Link href="/sign-in">Sign In</Link>
              </Button>
              <Button asChild variant="outline" className="w-full">
                <Link href="/sign-up">Create Account</Link>
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    )
  }

  if (success) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="text-center">
            <CheckCircle2 className="h-12 w-12 text-green-500 mx-auto" />
            <h2 className="mt-4 text-xl font-semibold">Welcome to the team!</h2>
            <p className="mt-2 text-muted-foreground">
              You&apos;ve successfully joined <strong>{invitation?.tenantName}</strong>.
              Redirecting you to the dashboard...
            </p>
          </div>
        </CardContent>
      </Card>
    )
  }

  if (!session?.user) {
    return (
      <Card>
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-club/10">
            <Users className="h-6 w-6 text-club" />
          </div>
          <CardTitle>Team Invitation</CardTitle>
          <CardDescription>
            You&apos;ve been invited to join <strong>{invitation?.tenantName}</strong>
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="rounded-lg border p-4 space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-sm text-muted-foreground">Team</span>
              <span className="font-medium">{invitation?.tenantName}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-muted-foreground">Role</span>
              <Badge variant="secondary">{invitation?.role}</Badge>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-muted-foreground">Invited by</span>
              <span className="font-medium">{invitation?.invitedByName}</span>
            </div>
          </div>

          <div className="text-center text-sm text-muted-foreground">
            <p>Sign in or create an account to accept this invitation.</p>
            <p className="mt-1">
              The invitation was sent to <strong>{invitation?.email}</strong>
            </p>
          </div>

          <div className="space-y-2">
            <Button asChild className="w-full">
              <Link href={`/sign-in?redirect=/accept-invite?token=${token}`}>
                Sign In
              </Link>
            </Button>
            <Button asChild variant="outline" className="w-full">
              <Link href={`/sign-up?redirect=/accept-invite?token=${token}&email=${invitation?.email}`}>
                Create Account
              </Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    )
  }

  // User is signed in, show accept button
  const emailMismatch = invitation?.email.toLowerCase() !== session.user.email?.toLowerCase()

  return (
    <Card>
      <CardHeader className="text-center">
        <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-club/10">
          <Users className="h-6 w-6 text-club" />
        </div>
        <CardTitle>Join {invitation?.tenantName}</CardTitle>
        <CardDescription>
          You&apos;ve been invited to join this team as a {invitation?.role}.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="rounded-lg border p-4 space-y-3">
          <div className="flex justify-between items-center">
            <span className="text-sm text-muted-foreground">Team</span>
            <span className="font-medium">{invitation?.tenantName}</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-sm text-muted-foreground">Your Role</span>
            <Badge variant="secondary">{invitation?.role}</Badge>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-sm text-muted-foreground">Invited by</span>
            <span className="font-medium">{invitation?.invitedByName}</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-sm text-muted-foreground">Expires</span>
            <span className="flex items-center gap-1 text-sm">
              <Clock className="h-3 w-3" />
              {invitation?.expiresAt && new Date(invitation.expiresAt).toLocaleDateString()}
            </span>
          </div>
        </div>

        {emailMismatch && (
          <div className="rounded-lg bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800 p-4 text-sm">
            <p className="font-medium text-amber-800 dark:text-amber-200">Email mismatch</p>
            <p className="mt-1 text-amber-700 dark:text-amber-300">
              This invitation was sent to <strong>{invitation?.email}</strong>, but you&apos;re
              signed in as <strong>{session.user.email}</strong>.
            </p>
            <p className="mt-2 text-amber-700 dark:text-amber-300">
              Please sign in with the correct account to accept this invitation.
            </p>
          </div>
        )}

        <div className="space-y-2">
          <Button
            onClick={handleAccept}
            disabled={isPending || emailMismatch}
            className="w-full"
          >
            {isPending ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Accepting...
              </>
            ) : (
              "Accept Invitation"
            )}
          </Button>
          <Button asChild variant="outline" className="w-full">
            <Link href="/dashboard">Cancel</Link>
          </Button>
        </div>

        <p className="text-center text-xs text-muted-foreground">
          By accepting, you agree to join this team and access its workspace.
        </p>
      </CardContent>
    </Card>
  )
}
