"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Trash2 } from "lucide-react"
import { deleteContact } from "@/lib/actions/contacts"

export function ContactActions({ contactId }: { contactId: string }) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [showConfirm, setShowConfirm] = useState(false)

  function handleDelete() {
    startTransition(async () => {
      await deleteContact(contactId)
      router.push("/crm")
    })
  }

  return (
    <Card className="border-destructive/20">
      <CardHeader>
        <CardTitle className="text-base">Danger Zone</CardTitle>
      </CardHeader>
      <CardContent>
        {showConfirm ? (
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">
              Are you sure? This action cannot be undone.
            </p>
            <div className="flex gap-2">
              <Button
                variant="destructive"
                size="sm"
                onClick={handleDelete}
                disabled={isPending}
              >
                {isPending ? "Deleting..." : "Yes, delete"}
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowConfirm(false)}
                disabled={isPending}
              >
                Cancel
              </Button>
            </div>
          </div>
        ) : (
          <Button
            variant="outline"
            className="w-full text-destructive hover:bg-destructive hover:text-destructive-foreground"
            onClick={() => setShowConfirm(true)}
          >
            <Trash2 className="h-4 w-4" />
            Delete Contact
          </Button>
        )}
      </CardContent>
    </Card>
  )
}
