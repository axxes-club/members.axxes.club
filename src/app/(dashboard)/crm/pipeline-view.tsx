"use client"

import { useState, useTransition } from "react"
import Link from "next/link"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  GripVertical,
  MoreVertical,
  Mail,
  Phone,
  Building2,
  ExternalLink,
  Star,
  Loader2,
} from "lucide-react"
import { updateLeadStatus, updateLeadScore } from "@/lib/actions/contacts"
import { toast } from "sonner"
import type { Contact } from "@/lib/db/schema"

interface PipelineViewProps {
  initialPipeline: {
    new: Contact[]
    contacted: Contact[]
    qualified: Contact[]
    converted: Contact[]
    lost: Contact[]
  }
}

const columns = [
  { id: "new", title: "New", color: "bg-slate-500" },
  { id: "contacted", title: "Contacted", color: "bg-blue-500" },
  { id: "qualified", title: "Qualified", color: "bg-purple-500" },
  { id: "converted", title: "Converted", color: "bg-green-500" },
  { id: "lost", title: "Lost", color: "bg-red-500" },
] as const

type ColumnId = typeof columns[number]["id"]

export function PipelineView({ initialPipeline }: PipelineViewProps) {
  const [pipeline, setPipeline] = useState(initialPipeline)
  const [isPending, startTransition] = useTransition()
  const [draggedContact, setDraggedContact] = useState<Contact | null>(null)
  const [dragOverColumn, setDragOverColumn] = useState<ColumnId | null>(null)
  const [scoreDialog, setScoreDialog] = useState<{ open: boolean; contact: Contact | null }>({
    open: false,
    contact: null,
  })
  const [newScore, setNewScore] = useState(0)

  const handleDragStart = (e: React.DragEvent, contact: Contact) => {
    setDraggedContact(contact)
    e.dataTransfer.effectAllowed = "move"
  }

  const handleDragOver = (e: React.DragEvent, columnId: ColumnId) => {
    e.preventDefault()
    e.dataTransfer.dropEffect = "move"
    setDragOverColumn(columnId)
  }

  const handleDragLeave = () => {
    setDragOverColumn(null)
  }

  const handleDrop = (e: React.DragEvent, targetColumnId: ColumnId) => {
    e.preventDefault()
    setDragOverColumn(null)

    if (!draggedContact) return

    const sourceColumnId = draggedContact.leadStatus || "new"

    // Don't do anything if dropping on the same column
    if (sourceColumnId === targetColumnId) {
      setDraggedContact(null)
      return
    }

    // Optimistic update
    setPipeline((prev) => {
      const newPipeline = { ...prev }
      // Remove from source
      newPipeline[sourceColumnId as keyof typeof prev] = prev[sourceColumnId as keyof typeof prev].filter(
        (c) => c.id !== draggedContact.id
      )
      // Add to target
      newPipeline[targetColumnId] = [
        { ...draggedContact, leadStatus: targetColumnId },
        ...prev[targetColumnId],
      ]
      return newPipeline
    })

    // Update on server
    startTransition(async () => {
      try {
        await updateLeadStatus(draggedContact.id, targetColumnId as Exclude<typeof targetColumnId, 'new'> | 'new')
        toast.success(`Lead moved to ${targetColumnId}`)
      } catch {
        toast.error("Failed to update lead status")
        // Revert on error
        setPipeline(initialPipeline)
      }
    })

    setDraggedContact(null)
  }

  const handleScoreUpdate = () => {
    if (!scoreDialog.contact) return

    const contactId = scoreDialog.contact.id

    startTransition(async () => {
      try {
        await updateLeadScore(contactId, newScore)
        // Update local state
        setPipeline((prev) => {
          const newPipeline = { ...prev }
          const status = scoreDialog.contact!.leadStatus || "new"
          newPipeline[status as keyof typeof prev] = prev[status as keyof typeof prev].map((c) =>
            c.id === scoreDialog.contact!.id ? { ...c, leadScore: newScore } : c
          )
          return newPipeline
        })
        toast.success("Lead score updated")
        setScoreDialog({ open: false, contact: null })
      } catch {
        toast.error("Failed to update lead score")
      }
    })
  }

  const getScoreColor = (score: number | null) => {
    if (score === null) return "text-muted-foreground"
    if (score >= 80) return "text-green-500"
    if (score >= 60) return "text-yellow-500"
    if (score >= 40) return "text-orange-500"
    return "text-red-500"
  }

  return (
    <>
      <div className="flex gap-4 overflow-x-auto pb-4">
        {columns.map((column) => {
          const contacts = pipeline[column.id]
          const isDropTarget = dragOverColumn === column.id

          return (
            <div
              key={column.id}
              className="flex-shrink-0 w-80"
              onDragOver={(e) => handleDragOver(e, column.id)}
              onDragLeave={handleDragLeave}
              onDrop={(e) => handleDrop(e, column.id)}
            >
              {/* Column Header */}
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <div className={`h-3 w-3 rounded-full ${column.color}`} />
                  <h3 className="font-medium text-sm">{column.title}</h3>
                  <span className="text-xs text-muted-foreground bg-muted rounded-full px-2 py-0.5">
                    {contacts.length}
                  </span>
                </div>
              </div>

              {/* Column Content */}
              <div
                className={`space-y-2 min-h-[200px] p-2 rounded-lg transition-colors ${
                  isDropTarget ? "bg-muted/50 ring-2 ring-primary/50" : ""
                }`}
              >
                {contacts.length === 0 ? (
                  <div className="flex items-center justify-center h-24 border-2 border-dashed border-muted-foreground/20 rounded-lg">
                    <p className="text-xs text-muted-foreground">Drop leads here</p>
                  </div>
                ) : (
                  contacts.map((contact) => (
                    <Card
                      key={contact.id}
                      draggable
                      onDragStart={(e) => handleDragStart(e, contact)}
                      className={`cursor-grab active:cursor-grabbing hover:shadow-md transition-shadow ${
                        draggedContact?.id === contact.id ? "opacity-50" : ""
                      }`}
                    >
                      <CardContent className="p-3">
                        <div className="flex items-start gap-2">
                          <GripVertical className="h-4 w-4 text-muted-foreground mt-1 flex-shrink-0" />
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between">
                              <Link
                                href={`/crm/${contact.id}`}
                                className="font-medium text-sm hover:underline truncate"
                              >
                                {contact.firstName} {contact.lastName}
                              </Link>
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <Button variant="ghost" size="icon-sm" className="flex-shrink-0">
                                    <MoreVertical className="h-3 w-3" />
                                  </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end">
                                  <DropdownMenuItem asChild>
                                    <Link href={`/crm/${contact.id}`}>
                                      <ExternalLink className="h-4 w-4 mr-2" />
                                      View Details
                                    </Link>
                                  </DropdownMenuItem>
                                  <DropdownMenuItem
                                    onClick={() => {
                                      setScoreDialog({ open: true, contact })
                                      setNewScore(contact.leadScore || 0)
                                    }}
                                  >
                                    <Star className="h-4 w-4 mr-2" />
                                    Update Score
                                  </DropdownMenuItem>
                                </DropdownMenuContent>
                              </DropdownMenu>
                            </div>

                            {contact.company && (
                              <div className="flex items-center gap-1 text-xs text-muted-foreground mt-1">
                                <Building2 className="h-3 w-3" />
                                <span className="truncate">{contact.company}</span>
                              </div>
                            )}

                            <div className="flex items-center gap-3 mt-2">
                              {contact.email && (
                                <a
                                  href={`mailto:${contact.email}`}
                                  className="text-muted-foreground hover:text-foreground"
                                  onClick={(e) => e.stopPropagation()}
                                >
                                  <Mail className="h-3 w-3" />
                                </a>
                              )}
                              {contact.phone && (
                                <a
                                  href={`tel:${contact.phone}`}
                                  className="text-muted-foreground hover:text-foreground"
                                  onClick={(e) => e.stopPropagation()}
                                >
                                  <Phone className="h-3 w-3" />
                                </a>
                              )}
                              {contact.leadScore !== null && (
                                <span className={`text-xs font-medium ml-auto ${getScoreColor(contact.leadScore)}`}>
                                  {contact.leadScore} pts
                                </span>
                              )}
                            </div>

                            {contact.leadSource && (
                              <Badge variant="outline" className="text-[10px] mt-2">
                                {contact.leadSource}
                              </Badge>
                            )}
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))
                )}
              </div>
            </div>
          )
        })}
      </div>

      {/* Score Update Dialog */}
      <Dialog open={scoreDialog.open} onOpenChange={(open) => setScoreDialog({ open, contact: null })}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Update Lead Score</DialogTitle>
            <DialogDescription>
              Set a score from 0-100 for this lead.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <Label>Score</Label>
            <div className="flex items-center gap-4 mt-2">
              <Input
                type="number"
                min={0}
                max={100}
                value={newScore}
                onChange={(e) => setNewScore(parseInt(e.target.value) || 0)}
                className="w-24"
              />
              <input
                type="range"
                min={0}
                max={100}
                value={newScore}
                onChange={(e) => setNewScore(parseInt(e.target.value))}
                className="flex-1"
              />
            </div>
            <p className={`text-sm mt-2 ${getScoreColor(newScore)}`}>
              {newScore >= 80 ? "Hot Lead" : newScore >= 60 ? "Warm Lead" : newScore >= 40 ? "Cool Lead" : "Cold Lead"}
            </p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setScoreDialog({ open: false, contact: null })}>
              Cancel
            </Button>
            <Button onClick={handleScoreUpdate} disabled={isPending}>
              {isPending && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
              Update
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}