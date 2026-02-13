"use client"

import { useState, useTransition } from "react"
import { formatDistanceToNow } from "date-fns"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { Mail, Clock, X, Copy, Check } from "lucide-react"
import { revokeInvitation } from "@/lib/actions/settings"
import type { TenantInvitation } from "@/lib/db/schema"

interface PendingInvitationsListProps {
  invitations: TenantInvitation[]
}

export function PendingInvitationsList({ invitations }: PendingInvitationsListProps) {
  const [isPending, startTransition] = useTransition()
  const [revokeDialogOpen, setRevokeDialogOpen] = useState(false)
  const [selectedInvitation, setSelectedInvitation] = useState<TenantInvitation | null>(null)
  const [copiedId, setCopiedId] = useState<string | null>(null)

  const handleRevoke = () => {
    if (!selectedInvitation) return

    startTransition(async () => {
      try {
        await revokeInvitation(selectedInvitation.id)
        setRevokeDialogOpen(false)
        setSelectedInvitation(null)
      } catch (error) {
        console.error("Failed to revoke invitation:", error)
      }
    })
  }

  const copyInviteLink = async (invitation: TenantInvitation) => {
    const link = `${window.location.origin}/accept-invite?token=${invitation.token}`
    await navigator.clipboard.writeText(link)
    setCopiedId(invitation.id)
    setTimeout(() => setCopiedId(null), 2000)
  }

  if (invitations.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12">
        <p className="text-muted-foreground">No pending invitations</p>
      </div>
    )
  }

  return (
    <>
      <div className={`divide-y ${isPending ? "opacity-50" : ""}`}>
        {invitations.map((invitation) => {
          const isExpired = new Date(invitation.expiresAt) < new Date()

          return (
            <div
              key={invitation.id}
              className="flex items-center justify-between p-4"
            >
              <div className="flex items-center gap-4">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-muted">
                  <Mail className="h-5 w-5 text-muted-foreground" />
                </div>
                <div>
                  <p className="font-medium">{invitation.email}</p>
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Clock className="h-3 w-3" />
                    {isExpired ? (
                      <span className="text-red-500">Expired</span>
                    ) : (
                      <span>
                        Expires {formatDistanceToNow(new Date(invitation.expiresAt), { addSuffix: true })}
                      </span>
                    )}
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <Badge variant="outline">{invitation.role}</Badge>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => copyInviteLink(invitation)}
                  disabled={isExpired}
                >
                  {copiedId === invitation.id ? (
                    <>
                      <Check className="h-4 w-4" />
                      Copied
                    </>
                  ) : (
                    <>
                      <Copy className="h-4 w-4" />
                      Copy Link
                    </>
                  )}
                </Button>
                <Button
                  variant="ghost"
                  size="icon-sm"
                  onClick={() => {
                    setSelectedInvitation(invitation)
                    setRevokeDialogOpen(true)
                  }}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )
        })}
      </div>

      <AlertDialog open={revokeDialogOpen} onOpenChange={setRevokeDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Revoke Invitation</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to revoke the invitation for{" "}
              <strong>{selectedInvitation?.email}</strong>? They will no longer be able to
              join your team using this invitation.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleRevoke}
              className="bg-red-600 hover:bg-red-700"
            >
              Revoke Invitation
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
