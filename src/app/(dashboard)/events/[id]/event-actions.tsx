"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Trash2, Send, Ban } from "lucide-react"
import { deleteEvent, publishEvent, updateEvent } from "@/lib/actions/events"

interface EventActionsProps {
  eventId: string
  status: string
}

export function EventActions({ eventId, status }: EventActionsProps) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [showConfirm, setShowConfirm] = useState(false)

  function handlePublish() {
    startTransition(async () => {
      await publishEvent(eventId)
    })
  }

  function handleCancel() {
    startTransition(async () => {
      await updateEvent(eventId, { status: "cancelled" })
    })
  }

  function handleDelete() {
    startTransition(async () => {
      await deleteEvent(eventId)
      router.push("/events")
    })
  }

  return (
    <>
      {status === "draft" && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Publish Event</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground mb-4">
              Publishing will make your event visible to attendees.
            </p>
            <Button onClick={handlePublish} disabled={isPending} className="w-full">
              <Send className="h-4 w-4" />
              {isPending ? "Publishing..." : "Publish Event"}
            </Button>
          </CardContent>
        </Card>
      )}

      {status === "published" && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Cancel Event</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground mb-4">
              Cancelling will notify all registered attendees.
            </p>
            <Button
              variant="outline"
              onClick={handleCancel}
              disabled={isPending}
              className="w-full text-destructive hover:bg-destructive hover:text-destructive-foreground"
            >
              <Ban className="h-4 w-4" />
              {isPending ? "Cancelling..." : "Cancel Event"}
            </Button>
          </CardContent>
        </Card>
      )}

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
              Delete Event
            </Button>
          )}
        </CardContent>
      </Card>
    </>
  )
}
