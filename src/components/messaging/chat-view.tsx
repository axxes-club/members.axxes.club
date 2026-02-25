"use client"

import * as React from "react"
import { 
  Hash, 
  Lock, 
  Users, 
  Settings, 
  Phone, 
  Video,
  Bell,
  BellOff,
  Pin,
  Search,
  MoreVertical
} from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { RoomList, PresenceIndicator } from "./room-list"
import { MessageList } from "./message-list"
import { MessageComposer } from "./message-composer"
import { useMatrix } from "@/lib/matrix"

interface ChatViewProps {
  tenantId?: string
}

export function ChatView({ tenantId }: ChatViewProps) {
  const { 
    currentRoom, 
    isInitialized,
    isSynced,
    error,
    login,
    setCurrentRoom 
  } = useMatrix()
  
  const [showSidebar, setShowSidebar] = React.useState(true)
  const [showMembers, setShowMembers] = React.useState(true)

  // Get current room info
  const roomName = currentRoom?.name || "Select a conversation"
  const roomTopic = currentRoom?.topic
  const memberCount = currentRoom?.members.length || 0
  const isEncrypted = currentRoom?.isEncrypted
  const isDirect = currentRoom?.isDirect

  return (
    <div className="flex h-[calc(100vh-4rem)]">
      {/* Sidebar - Room List */}
      <div
        className={cn(
          "border-r bg-muted/30 flex-shrink-0 transition-all duration-200",
          showSidebar ? "w-64" : "w-0 overflow-hidden"
        )}
      >
        <RoomList
          tenantId={tenantId}
          onRoomSelect={(roomId) => setCurrentRoom(roomId)}
        />
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Header */}
        <div className="flex items-center gap-4 px-4 py-3 border-b bg-background">
          {/* Toggle sidebar */}
          <Button
            variant="ghost"
            size="icon-sm"
            onClick={() => setShowSidebar(!showSidebar)}
          >
            <svg
              className="h-4 w-4"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M4 6h16M4 12h16M4 18h16"
              />
            </svg>
          </Button>

          {/* Room info */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              {currentRoom ? (
                <>
                  {isDirect ? (
                    <Avatar className="h-6 w-6">
                      <AvatarImage src={currentRoom.avatarUrl || undefined} />
                      <AvatarFallback className="text-xs">
                        {roomName[0]?.toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                  ) : (
                    <div className="flex items-center justify-center h-6 w-6">
                      {isEncrypted ? (
                        <Lock className="h-4 w-4 text-muted-foreground" />
                      ) : (
                        <Hash className="h-4 w-4 text-muted-foreground" />
                      )}
                    </div>
                  )}
                  <h2 className="font-medium truncate">{roomName}</h2>
                </>
              ) : (
                <h2 className="font-medium text-muted-foreground">Messages</h2>
              )}
            </div>
            {roomTopic && (
              <p className="text-xs text-muted-foreground truncate mt-0.5">
                {roomTopic}
              </p>
            )}
          </div>

          {/* Actions */}
          {currentRoom && (
            <div className="flex items-center gap-1">
              {/* Call buttons (placeholder) */}
              <Button variant="ghost" size="icon-sm" disabled>
                <Phone className="h-4 w-4" />
              </Button>
              <Button variant="ghost" size="icon-sm" disabled>
                <Video className="h-4 w-4" />
              </Button>
              
              <Separator orientation="vertical" className="h-6 mx-1" />
              
              {/* Search */}
              <Button variant="ghost" size="icon-sm">
                <Search className="h-4 w-4" />
              </Button>
              
              {/* Members toggle */}
              <Button
                variant="ghost"
                size="icon-sm"
                onClick={() => setShowMembers(!showMembers)}
              >
                <Users className="h-4 w-4" />
              </Button>
              
              {/* More options */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon-sm">
                    <MoreVertical className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem>
                    <Bell className="h-4 w-4 mr-2" />
                    All messages
                  </DropdownMenuItem>
                  <DropdownMenuItem>
                    <BellOff className="h-4 w-4 mr-2" />
                    Mute room
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem>
                    <Pin className="h-4 w-4 mr-2" />
                    Pin to sidebar
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem>
                    <Settings className="h-4 w-4 mr-2" />
                    Room settings
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          )}
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-hidden">
          <MessageList roomId={currentRoom?.id || null} />
        </div>

        {/* Composer */}
        <MessageComposer
          roomId={currentRoom?.id || null}
          onMessageSent={() => {
            // Message sent callback
          }}
        />
      </div>

      {/* Members Sidebar */}
      {showMembers && currentRoom && (
        <div className="w-60 border-l bg-muted/30 flex-shrink-0">
          <div className="p-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-medium">Members</h3>
              <Badge variant="secondary" className="text-xs">
                {memberCount}
              </Badge>
            </div>
            <div className="space-y-1">
              {currentRoom.members.map((member) => (
                <div
                  key={member.userId}
                  className="flex items-center gap-2 px-2 py-1.5 rounded hover:bg-muted transition-colors"
                >
                  <div className="relative">
                    <Avatar className="h-6 w-6">
                      <AvatarImage src={member.avatarUrl || undefined} />
                      <AvatarFallback className="text-xs">
                        {member.displayName?.[0]?.toUpperCase() || "?"}
                      </AvatarFallback>
                    </Avatar>
                    <PresenceIndicator
                      presence={member.presence}
                      className="absolute -bottom-0.5 -right-0.5 ring-2 ring-background"
                    />
                  </div>
                  <span className="text-sm truncate">
                    {member.displayName}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}