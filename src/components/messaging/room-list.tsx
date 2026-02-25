"use client"

import * as React from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { 
  Hash, 
  Lock, 
  MessageSquare, 
  Plus, 
  Search,
  ChevronDown,
  ChevronRight,
  Users,
  Circle,
  Loader2
} from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible"
import { useMatrix, type MatrixRoomData } from "@/lib/matrix"
import { CreateRoomDialog } from "./create-room-dialog"

interface RoomListProps {
  tenantId?: string
  onRoomSelect?: (roomId: string) => void
}

export function RoomList({ tenantId, onRoomSelect }: RoomListProps) {
  const pathname = usePathname()
  const { 
    isInitialized, 
    isSynced, 
    channels, 
    dms, 
    currentRoom,
    setCurrentRoom 
  } = useMatrix()
  
  const [searchQuery, setSearchQuery] = React.useState("")
  const [channelsOpen, setChannelsOpen] = React.useState(true)
  const [dmsOpen, setDmsOpen] = React.useState(true)

  const filteredChannels = React.useMemo(() => {
    if (!searchQuery) return channels
    return channels.filter((room) =>
      room.name.toLowerCase().includes(searchQuery.toLowerCase())
    )
  }, [channels, searchQuery])

  const filteredDms = React.useMemo(() => {
    if (!searchQuery) return dms
    return dms.filter((room) =>
      room.name.toLowerCase().includes(searchQuery.toLowerCase())
    )
  }, [dms, searchQuery])

  const handleRoomClick = (roomId: string) => {
    setCurrentRoom(roomId)
    onRoomSelect?.(roomId)
  }

  if (!isInitialized || !isSynced) {
    return (
      <div className="flex items-center justify-center h-32">
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full">
      {/* Search & Create */}
      <div className="p-3 border-b space-y-2">
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search conversations..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-8 h-8 text-sm"
          />
        </div>
        <CreateRoomDialog
          trigger={
            <Button variant="outline" size="sm" className="w-full">
              <Plus className="h-4 w-4 mr-2" />
              New Conversation
            </Button>
          }
          onRoomCreated={(roomId) => handleRoomClick(roomId)}
        />
      </div>

      <ScrollArea className="flex-1">
        <div className="p-2 space-y-1">
          {/* Channels Section */}
          <Collapsible open={channelsOpen} onOpenChange={setChannelsOpen}>
            <CollapsibleTrigger asChild>
              <button className="flex items-center gap-1 w-full px-2 py-1.5 text-xs font-medium text-muted-foreground hover:text-foreground transition-colors">
                {channelsOpen ? (
                  <ChevronDown className="h-3 w-3" />
                ) : (
                  <ChevronRight className="h-3 w-3" />
                )}
                <Hash className="h-3 w-3" />
                <span>Channels</span>
                <Badge variant="secondary" className="ml-auto h-4 px-1 text-[10px]">
                  {filteredChannels.length}
                </Badge>
              </button>
            </CollapsibleTrigger>
            <CollapsibleContent>
              <div className="mt-1 space-y-0.5">
                {filteredChannels.map((room) => (
                  <RoomItem
                    key={room.id}
                    room={room}
                    isActive={currentRoom?.id === room.id}
                    onClick={() => handleRoomClick(room.id)}
                  />
                ))}
                {filteredChannels.length === 0 && (
                  <p className="px-2 py-1 text-xs text-muted-foreground">
                    No channels
                  </p>
                )}
              </div>
            </CollapsibleContent>
          </Collapsible>

          {/* DMs Section */}
          <Collapsible open={dmsOpen} onOpenChange={setDmsOpen}>
            <CollapsibleTrigger asChild>
              <button className="flex items-center gap-1 w-full px-2 py-1.5 text-xs font-medium text-muted-foreground hover:text-foreground transition-colors">
                {dmsOpen ? (
                  <ChevronDown className="h-3 w-3" />
                ) : (
                  <ChevronRight className="h-3 w-3" />
                )}
                <MessageSquare className="h-3 w-3" />
                <span>Direct Messages</span>
                <Badge variant="secondary" className="ml-auto h-4 px-1 text-[10px]">
                  {filteredDms.length}
                </Badge>
              </button>
            </CollapsibleTrigger>
            <CollapsibleContent>
              <div className="mt-1 space-y-0.5">
                {filteredDms.map((room) => (
                  <RoomItem
                    key={room.id}
                    room={room}
                    isActive={currentRoom?.id === room.id}
                    onClick={() => handleRoomClick(room.id)}
                  />
                ))}
                {filteredDms.length === 0 && (
                  <p className="px-2 py-1 text-xs text-muted-foreground">
                    No direct messages
                  </p>
                )}
              </div>
            </CollapsibleContent>
          </Collapsible>
        </div>
      </ScrollArea>
    </div>
  )
}

interface RoomItemProps {
  room: MatrixRoomData
  isActive: boolean
  onClick: () => void
}

function RoomItem({ room, isActive, onClick }: RoomItemProps) {
  const unreadCount = room.unreadCount + room.highlightCount
  
  return (
    <button
      onClick={onClick}
      className={cn(
        "flex items-center gap-2 w-full px-2 py-1.5 text-sm rounded transition-colors text-left",
        isActive
          ? "bg-accent text-accent-foreground"
          : "hover:bg-muted",
        unreadCount > 0 && !isActive && "bg-muted/50"
      )}
    >
      {/* Room icon/avatar */}
      {room.isDirect ? (
        <Avatar className="h-5 w-5">
          <AvatarImage src={room.avatarUrl || undefined} />
          <AvatarFallback className="text-[10px]">
            {room.name[0]?.toUpperCase()}
          </AvatarFallback>
        </Avatar>
      ) : (
        <div className="flex items-center justify-center h-5 w-5">
          {room.isEncrypted ? (
            <Lock className="h-3.5 w-3.5 text-muted-foreground" />
          ) : (
            <Hash className="h-3.5 w-3.5 text-muted-foreground" />
          )}
        </div>
      )}

      {/* Room name */}
      <span className={cn(
        "flex-1 truncate",
        unreadCount > 0 && "font-semibold"
      )}>
        {room.name}
      </span>

      {/* Unread badge */}
      {unreadCount > 0 && (
        <Badge 
          variant={room.highlightCount > 0 ? "default" : "secondary"}
          className="h-4 px-1 text-[10px] min-w-[16px] justify-center"
        >
          {unreadCount > 99 ? "99+" : unreadCount}
        </Badge>
      )}
    </button>
  )
}

// Presence indicator component
export function PresenceIndicator({ 
  presence, 
  className 
}: { 
  presence: "online" | "offline" | "unavailable"
  className?: string 
}) {
  return (
    <Circle
      className={cn(
        "h-2 w-2 fill-current",
        presence === "online" && "text-green-500",
        presence === "unavailable" && "text-yellow-500",
        presence === "offline" && "text-muted-foreground",
        className
      )}
    />
  )
}