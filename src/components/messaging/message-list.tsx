"use client"

import * as React from "react"
import { format, isToday, isYesterday, isSameDay } from "date-fns"
import { 
  Avatar, 
  AvatarFallback, 
  AvatarImage 
} from "@/components/ui/avatar"
import { ScrollArea } from "@/components/ui/scroll-area"
import { cn } from "@/lib/utils"
import { useMatrix, useTypingUsers, type MatrixMessage } from "@/lib/matrix"
import { Loader2 } from "lucide-react"

interface MessageListProps {
  roomId: string | null
}

export function MessageList({ roomId }: MessageListProps) {
  const { currentRoom, messages, isInitialized } = useMatrix()
  const typingUsers = useTypingUsers(roomId)
  const scrollRef = React.useRef<HTMLDivElement>(null)
  const [isLoading, setIsLoading] = React.useState(false)

  // Group messages by date
  const messageGroups = React.useMemo(() => {
    const groups: { date: Date; messages: MatrixMessage[] }[] = []
    
    messages.forEach((message) => {
      const messageDate = new Date(message.timestamp)
      const lastGroup = groups[groups.length - 1]
      
      if (!lastGroup || !isSameDay(lastGroup.date, messageDate)) {
        groups.push({ date: messageDate, messages: [message] })
      } else {
        lastGroup.messages.push(message)
      }
    })
    
    return groups
  }, [messages])

  // Scroll to bottom when new messages arrive
  React.useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [messages])

  if (!isInitialized) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (!currentRoom) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-center p-8">
        <div className="flex h-16 w-16 items-center justify-center rounded-full bg-muted mb-4">
          <span className="text-2xl">💬</span>
        </div>
        <h3 className="text-lg font-medium">Select a conversation</h3>
        <p className="text-sm text-muted-foreground mt-1">
          Choose a channel or direct message from the sidebar
        </p>
      </div>
    )
  }

  if (messages.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-center p-8">
        <div className="flex h-16 w-16 items-center justify-center rounded-full bg-muted mb-4">
          <span className="text-2xl">👋</span>
        </div>
        <h3 className="text-lg font-medium">No messages yet</h3>
        <p className="text-sm text-muted-foreground mt-1">
          Be the first to send a message in {currentRoom.name}
        </p>
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full">
      <ScrollArea ref={scrollRef} className="flex-1">
        <div className="p-4 space-y-6">
          {messageGroups.map((group) => (
            <div key={group.date.toISOString()}>
              {/* Date separator */}
              <div className="flex items-center justify-center mb-4">
                <span className="text-xs text-muted-foreground bg-muted px-3 py-1 rounded-full">
                  {formatDate(group.date)}
                </span>
              </div>

              {/* Messages */}
              <div className="space-y-1">
                {group.messages.map((message, index) => {
                  const prevMessage = group.messages[index - 1]
                  const showAvatar = !prevMessage || 
                    prevMessage.senderId !== message.senderId ||
                    message.timestamp - prevMessage.timestamp > 300000 // 5 minutes

                  return (
                    <MessageItem
                      key={message.id}
                      message={message}
                      showAvatar={showAvatar}
                    />
                  )
                })}
              </div>
            </div>
          ))}
        </div>
      </ScrollArea>

      {/* Typing indicator */}
      {typingUsers.length > 0 && (
        <div className="px-4 py-2 border-t">
          <TypingIndicator users={typingUsers} />
        </div>
      )}
    </div>
  )
}

interface MessageItemProps {
  message: MatrixMessage
  showAvatar: boolean
}

function MessageItem({ message, showAvatar }: MessageItemProps) {
  const { client, currentRoom } = useMatrix()
  const isOwn = message.senderId === client?.getUserId()
  
  // Get sender info
  const sender = currentRoom?.members.find(
    (m) => m.userId === message.senderId
  )
  
  const senderName = sender?.displayName || message.senderName
  const senderAvatar = sender?.avatarUrl || message.senderAvatar

  // Format time
  const time = format(new Date(message.timestamp), "h:mm a")

  if (message.isRedacted) {
    return (
      <div className="flex items-center gap-2 px-4 py-1 text-sm text-muted-foreground italic">
        <span>Message deleted</span>
      </div>
    )
  }

  return (
    <div
      className={cn(
        "flex gap-3 px-1 py-0.5",
        showAvatar && "mt-3"
      )}
    >
      {/* Avatar */}
      <div className={cn("shrink-0", showAvatar ? "h-8 w-8" : "w-8")}>
        {showAvatar && (
          <Avatar className="h-8 w-8">
            <AvatarImage src={senderAvatar || undefined} />
            <AvatarFallback>
              {senderName?.[0]?.toUpperCase() || "?"}
            </AvatarFallback>
          </Avatar>
        )}
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        {showAvatar && (
          <div className="flex items-baseline gap-2 mb-0.5">
            <span className={cn(
              "font-medium text-sm",
              isOwn && "text-club"
            )}>
              {senderName}
            </span>
            <span className="text-[10px] text-muted-foreground">
              {time}
            </span>
          </div>
        )}
        
        {/* Message content */}
        <div className="text-sm break-words whitespace-pre-wrap">
          {message.content}
        </div>

        {/* Reactions */}
        {message.reactions.size > 0 && (
          <div className="flex flex-wrap gap-1 mt-1">
            {Array.from(message.reactions.entries()).map(([emoji, users]) => (
              <button
                key={emoji}
                className={cn(
                  "flex items-center gap-1 px-1.5 py-0.5 text-xs border rounded-full transition-colors",
                  users.includes(client?.getUserId() || "")
                    ? "bg-club/10 border-club/30"
                    : "bg-muted border-border hover:bg-accent"
                )}
              >
                <span>{emoji}</span>
                <span className="text-muted-foreground">{users.length}</span>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

function TypingIndicator({ users }: { users: string[] }) {
  return (
    <div className="flex items-center gap-2 text-sm text-muted-foreground">
      <div className="flex gap-0.5">
        <span className="w-1.5 h-1.5 bg-muted-foreground rounded-full animate-bounce" style={{ animationDelay: "0ms" }} />
        <span className="w-1.5 h-1.5 bg-muted-foreground rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
        <span className="w-1.5 h-1.5 bg-muted-foreground rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
      </div>
      <span>
        {users.length === 1
          ? "Someone is typing..."
          : `${users.length} people are typing...`}
      </span>
    </div>
  )
}

function formatDate(date: Date): string {
  if (isToday(date)) return "Today"
  if (isYesterday(date)) return "Yesterday"
  return format(date, "MMMM d, yyyy")
}