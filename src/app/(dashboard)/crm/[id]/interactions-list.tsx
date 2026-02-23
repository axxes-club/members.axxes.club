"use client"

import { useState, useTransition } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
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
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Textarea } from "@/components/ui/textarea"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Mail,
  Phone,
  MessageSquare,
  Video,
  StickyNote,
  Share2,
  MoreVertical,
  Plus,
  Trash2,
  Clock,
  Loader2,
} from "lucide-react"
import { createContactInteraction, deleteContactInteraction } from "@/lib/actions/contacts"
import { toast } from "sonner"
import { format, formatDistanceToNow } from "date-fns"
import type { ContactInteraction } from "@/lib/db/schema"

interface InteractionsListProps {
  contactId: string
  initialInteractions: ContactInteraction[]
}

const interactionTypeConfig = {
  email: { icon: Mail, label: "Email", color: "bg-blue-500" },
  call: { icon: Phone, label: "Call", color: "bg-green-500" },
  meeting: { icon: Video, label: "Meeting", color: "bg-purple-500" },
  note: { icon: StickyNote, label: "Note", color: "bg-yellow-500" },
  sms: { icon: MessageSquare, label: "SMS", color: "bg-cyan-500" },
  social: { icon: Share2, label: "Social", color: "bg-pink-500" },
}

export function InteractionsList({ contactId, initialInteractions }: InteractionsListProps) {
  const [interactions, setInteractions] = useState<ContactInteraction[]>(initialInteractions)
  const [isPending, startTransition] = useTransition()
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [newInteraction, setNewInteraction] = useState({
    type: "note" as const,
    subject: "",
    content: "",
    occurredAt: new Date().toISOString().slice(0, 16),
  })

  const handleCreateInteraction = async () => {
    if (!newInteraction.content.trim()) {
      toast.error("Please enter content for the interaction")
      return
    }

    startTransition(async () => {
      try {
        const interaction = await createContactInteraction(contactId, {
          type: newInteraction.type,
          subject: newInteraction.subject || undefined,
          content: newInteraction.content,
          occurredAt: newInteraction.occurredAt,
        })
        setInteractions((prev) => [interaction, ...prev])
        setNewInteraction({
          type: "note",
          subject: "",
          content: "",
          occurredAt: new Date().toISOString().slice(0, 16),
        })
        setIsDialogOpen(false)
        toast.success("Interaction logged")
      } catch {
        toast.error("Failed to log interaction")
      }
    })
  }

  const handleDeleteInteraction = async (interactionId: string) => {
    startTransition(async () => {
      try {
        await deleteContactInteraction(interactionId)
        setInteractions((prev) => prev.filter((i) => i.id !== interactionId))
        toast.success("Interaction deleted")
      } catch {
        toast.error("Failed to delete interaction")
      }
    })
  }

  const groupInteractionsByDate = (interactions: ContactInteraction[]) => {
    const groups: { [key: string]: ContactInteraction[] } = {}

    interactions.forEach((interaction) => {
      const date = format(new Date(interaction.occurredAt), "yyyy-MM-dd")
      if (!groups[date]) {
        groups[date] = []
      }
      groups[date].push(interaction)
    })

    return Object.entries(groups).sort(([a], [b]) => b.localeCompare(a))
  }

  const groupedInteractions = groupInteractionsByDate(interactions)

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold">Activity Timeline</h3>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button size="sm">
              <Plus className="h-4 w-4" />
              Log Interaction
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Log Interaction</DialogTitle>
              <DialogDescription>
                Record a new interaction with this contact.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label>Type</Label>
                <Select
                  value={newInteraction.type}
                  onValueChange={(value: typeof newInteraction.type) =>
                    setNewInteraction((prev) => ({ ...prev, type: value }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="email">Email</SelectItem>
                    <SelectItem value="call">Call</SelectItem>
                    <SelectItem value="meeting">Meeting</SelectItem>
                    <SelectItem value="note">Note</SelectItem>
                    <SelectItem value="sms">SMS</SelectItem>
                    <SelectItem value="social">Social</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Subject (optional)</Label>
                <Input
                  value={newInteraction.subject}
                  onChange={(e) =>
                    setNewInteraction((prev) => ({ ...prev, subject: e.target.value }))
                  }
                  placeholder="What was this about?"
                />
              </div>

              <div className="space-y-2">
                <Label>Content</Label>
                <Textarea
                  value={newInteraction.content}
                  onChange={(e) =>
                    setNewInteraction((prev) => ({ ...prev, content: e.target.value }))
                  }
                  placeholder="Details about this interaction..."
                  rows={4}
                />
              </div>

              <div className="space-y-2">
                <Label>Date & Time</Label>
                <Input
                  type="datetime-local"
                  value={newInteraction.occurredAt}
                  onChange={(e) =>
                    setNewInteraction((prev) => ({ ...prev, occurredAt: e.target.value }))
                  }
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleCreateInteraction} disabled={isPending}>
                {isPending && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                Save
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {interactions.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Clock className="h-12 w-12 text-muted-foreground mb-4" />
            <p className="text-sm text-muted-foreground">No interactions recorded yet</p>
            <p className="text-xs text-muted-foreground mt-1">
              Log your first interaction to start tracking your communication history
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-6">
          {groupedInteractions.map(([date, dateInteractions]) => (
            <div key={date}>
              <div className="sticky top-0 z-10 bg-background py-2">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  {format(new Date(date), "MMMM d, yyyy")}
                </p>
              </div>
              <div className="relative ml-4 border-l-2 border-border pl-6 space-y-4">
                {dateInteractions.map((interaction) => {
                  const config = interactionTypeConfig[interaction.type]
                  const Icon = config.icon

                  return (
                    <div
                      key={interaction.id}
                      className="relative group"
                    >
                      {/* Timeline dot */}
                      <div
                        className={`absolute -left-[1.85rem] top-1 h-3 w-3 rounded-full ${config.color} ring-2 ring-background`}
                      />

                      <Card>
                        <CardContent className="p-4">
                          <div className="flex items-start justify-between gap-4">
                            <div className="flex items-start gap-3 flex-1 min-w-0">
                              <div className={`rounded-md p-2 ${config.color} bg-opacity-10`}>
                                <Icon className="h-4 w-4" />
                              </div>
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 flex-wrap">
                                  <Badge variant="outline" className="text-xs">
                                    {config.label}
                                  </Badge>
                                  {interaction.subject && (
                                    <span className="font-medium text-sm">
                                      {interaction.subject}
                                    </span>
                                  )}
                                </div>
                                <p className="mt-2 text-sm whitespace-pre-wrap">
                                  {interaction.content}
                                </p>
                                <p className="mt-2 text-xs text-muted-foreground">
                                  {formatDistanceToNow(new Date(interaction.occurredAt), {
                                    addSuffix: true,
                                  })}
                                </p>
                              </div>
                            </div>

                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button
                                  variant="ghost"
                                  size="icon-sm"
                                  className="opacity-0 group-hover:opacity-100 transition-opacity"
                                >
                                  <MoreVertical className="h-4 w-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuItem
                                  className="text-destructive"
                                  onClick={() => handleDeleteInteraction(interaction.id)}
                                >
                                  <Trash2 className="h-4 w-4 mr-2" />
                                  Delete
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </div>
                        </CardContent>
                      </Card>
                    </div>
                  )
                })}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}