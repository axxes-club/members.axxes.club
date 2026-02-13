"use client"

import * as React from "react"
import { Badge } from "@/components/ui/badge"
import { getPusherClient, PUSHER_EVENTS } from "@/lib/pusher/client"
import { useSession } from "@/lib/auth/client"

interface UnreadBadgeProps {
  initialCount: number
}

export function UnreadBadge({ initialCount }: UnreadBadgeProps) {
  const { data: session } = useSession()
  const [count, setCount] = React.useState(initialCount)

  React.useEffect(() => {
    if (!session?.user?.id) return

    const pusher = getPusherClient()
    const channel = pusher.subscribe(`private-user-${session.user.id}`)

    channel.bind(
      PUSHER_EVENTS.UNREAD_COUNT_UPDATED,
      (data: { conversationId: string; unreadCount: number }) => {
        // When a conversation's unread count changes, we need to refresh the total
        // For simplicity, we increment/decrement based on the event
        // A more accurate approach would be to track per-conversation counts
        setCount((prev) => {
          if (data.unreadCount > 0) {
            return prev + 1
          }
          return Math.max(0, prev - 1)
        })
      }
    )

    return () => {
      channel.unbind_all()
      pusher.unsubscribe(`private-user-${session.user.id}`)
    }
  }, [session?.user?.id])

  if (count === 0) return null

  return (
    <Badge variant="club" className="ml-auto h-5 min-w-[20px] px-1.5 text-[10px]">
      {count > 99 ? "99+" : count}
    </Badge>
  )
}
