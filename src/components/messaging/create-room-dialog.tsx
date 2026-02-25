"use client"

import * as React from "react"
import { Hash, Lock, Users, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Switch } from "@/components/ui/switch"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { useMatrix } from "@/lib/matrix"
import { createRoom } from "@/lib/matrix/client"

interface CreateRoomDialogProps {
  trigger?: React.ReactNode
  onRoomCreated?: (roomId: string) => void
}

export function CreateRoomDialog({ trigger, onRoomCreated }: CreateRoomDialogProps) {
  const { client, refreshRooms } = useMatrix()
  const [open, setOpen] = React.useState(false)
  const [isLoading, setIsLoading] = React.useState(false)
  const [name, setName] = React.useState("")
  const [topic, setTopic] = React.useState("")
  const [type, setType] = React.useState<"channel" | "dm">("channel")
  const [isPublic, setIsPublic] = React.useState(false)

  const handleCreate = async () => {
    if (!client || !name.trim()) return

    setIsLoading(true)
    try {
      const roomId = await createRoom(client, {
        name: name.trim(),
        topic: topic.trim() || undefined,
        isPublic,
        isDirect: type === "dm",
      })

      // Refresh rooms list
      refreshRooms()

      // Reset form
      setName("")
      setTopic("")
      setType("channel")
      setIsPublic(false)

      // Close dialog
      setOpen(false)

      // Callback
      onRoomCreated?.(roomId)
    } catch (error) {
      console.error("Failed to create room:", error)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <Button size="sm">
            <Hash className="h-4 w-4 mr-2" />
            New Channel
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Create a new conversation</DialogTitle>
          <DialogDescription>
            Create a channel for group discussions or a direct message for 1:1 conversations.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="type">Type</Label>
            <Select
              value={type}
              onValueChange={(v) => setType(v as "channel" | "dm")}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="channel">
                  <div className="flex items-center gap-2">
                    <Hash className="h-4 w-4" />
                    <span>Channel</span>
                  </div>
                </SelectItem>
                <SelectItem value="dm">
                  <div className="flex items-center gap-2">
                    <Users className="h-4 w-4" />
                    <span>Direct Message</span>
                  </div>
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="name">Name</Label>
            <Input
              id="name"
              placeholder={type === "channel" ? "general" : "John Doe"}
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>

          {type === "channel" && (
            <div className="space-y-2">
              <Label htmlFor="topic">Topic (optional)</Label>
              <Textarea
                id="topic"
                placeholder="What's this channel about?"
                value={topic}
                onChange={(e) => setTopic(e.target.value)}
                rows={2}
              />
            </div>
          )}

          {type === "channel" && (
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="public">Public Channel</Label>
                <p className="text-xs text-muted-foreground">
                  Anyone can join and view message history
                </p>
              </div>
              <Switch
                id="public"
                checked={isPublic}
                onCheckedChange={setIsPublic}
              />
            </div>
          )}
        </div>
        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => setOpen(false)}
            disabled={isLoading}
          >
            Cancel
          </Button>
          <Button
            onClick={handleCreate}
            disabled={!name.trim() || isLoading}
          >
            {isLoading ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Creating...
              </>
            ) : (
              <>
                {type === "channel" ? (
                  <Hash className="h-4 w-4 mr-2" />
                ) : (
                  <Users className="h-4 w-4 mr-2" />
                )}
                Create {type === "channel" ? "Channel" : "Conversation"}
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}