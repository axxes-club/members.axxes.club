"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import { Plus, Search, Check, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { ScrollArea } from "@/components/ui/scroll-area"
import { cn } from "@/lib/utils"
import {
  createConversation,
  getTeamMembersForMessaging,
} from "@/lib/actions/messaging"

interface TeamMember {
  id: string
  name: string
  email: string
  image: string | null
  role: string
}

export function NewConversationDialog() {
  const router = useRouter()
  const [open, setOpen] = React.useState(false)
  const [search, setSearch] = React.useState("")
  const [selectedMembers, setSelectedMembers] = React.useState<string[]>([])
  const [groupName, setGroupName] = React.useState("")
  const [teamMembers, setTeamMembers] = React.useState<TeamMember[]>([])
  const [isLoading, setIsLoading] = React.useState(false)
  const [isLoadingMembers, setIsLoadingMembers] = React.useState(false)

  React.useEffect(() => {
    if (open) {
      setIsLoadingMembers(true)
      getTeamMembersForMessaging()
        .then(setTeamMembers)
        .finally(() => setIsLoadingMembers(false))
    } else {
      // Reset state when dialog closes
      setSearch("")
      setSelectedMembers([])
      setGroupName("")
    }
  }, [open])

  const filteredMembers = teamMembers.filter(
    (member) =>
      member.name.toLowerCase().includes(search.toLowerCase()) ||
      member.email.toLowerCase().includes(search.toLowerCase())
  )

  const toggleMember = (memberId: string) => {
    setSelectedMembers((prev) =>
      prev.includes(memberId)
        ? prev.filter((id) => id !== memberId)
        : [...prev, memberId]
    )
  }

  const handleCreate = async () => {
    if (selectedMembers.length === 0) return

    setIsLoading(true)
    try {
      const conversation = await createConversation({
        participantIds: selectedMembers,
        type: selectedMembers.length > 1 ? "group" : "direct",
        name: selectedMembers.length > 1 ? groupName : undefined,
      })
      setOpen(false)
      router.push(`/messages/${conversation.id}`)
    } catch (error) {
      console.error("Failed to create conversation:", error)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <Plus className="h-4 w-4" />
          New Message
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>New Conversation</DialogTitle>
          <DialogDescription>
            Select team members to start a conversation.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search team members..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>

          {selectedMembers.length > 1 && (
            <div>
              <Label htmlFor="groupName">Group Name</Label>
              <Input
                id="groupName"
                placeholder="Enter group name..."
                value={groupName}
                onChange={(e) => setGroupName(e.target.value)}
              />
            </div>
          )}

          {selectedMembers.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {selectedMembers.map((id) => {
                const member = teamMembers.find((m) => m.id === id)
                return (
                  <Badge
                    key={id}
                    variant="secondary"
                    className="cursor-pointer"
                    onClick={() => toggleMember(id)}
                  >
                    {member?.name}
                    <span className="ml-1">&times;</span>
                  </Badge>
                )
              })}
            </div>
          )}

          <ScrollArea className="h-[250px]">
            {isLoadingMembers ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : filteredMembers.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-8 text-center">
                <p className="text-sm text-muted-foreground">
                  {teamMembers.length === 0
                    ? "No team members found"
                    : "No results found"}
                </p>
              </div>
            ) : (
              <div className="space-y-1">
                {filteredMembers.map((member) => {
                  const isSelected = selectedMembers.includes(member.id)
                  return (
                    <button
                      key={member.id}
                      onClick={() => toggleMember(member.id)}
                      className={cn(
                        "flex w-full items-center gap-3 p-2 text-left transition-colors",
                        isSelected
                          ? "bg-club/10 text-club"
                          : "hover:bg-accent"
                      )}
                    >
                      <Avatar className="h-10 w-10">
                        <AvatarImage src={member.image || undefined} />
                        <AvatarFallback>
                          {member.name[0]?.toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium truncate">{member.name}</p>
                        <p className="text-xs text-muted-foreground truncate">
                          {member.email}
                        </p>
                      </div>
                      <Badge variant="outline" className="text-[10px] shrink-0">
                        {member.role}
                      </Badge>
                      {isSelected && (
                        <Check className="h-5 w-5 text-club shrink-0" />
                      )}
                    </button>
                  )
                })}
              </div>
            )}
          </ScrollArea>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button
            onClick={handleCreate}
            disabled={selectedMembers.length === 0 || isLoading}
          >
            {isLoading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              "Start Conversation"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
