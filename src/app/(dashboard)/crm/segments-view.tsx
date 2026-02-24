"use client"

import { useState, useTransition } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
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
import {
  Folders,
  Plus,
  MoreVertical,
  Trash2,
  Users,
  Loader2,
} from "lucide-react"
import { createSegment, deleteSegment } from "@/lib/actions/contacts"
import { toast } from "sonner"
import { format } from "date-fns"
import type { CustomerSegment } from "@/lib/db/schema"

interface SegmentWithCount extends CustomerSegment {
  memberCount: number
}

interface SegmentsViewProps {
  initialSegments: SegmentWithCount[]
}

const colorOptions = [
  { name: "Blue", value: "bg-blue-500" },
  { name: "Green", value: "bg-green-500" },
  { name: "Purple", value: "bg-purple-500" },
  { name: "Orange", value: "bg-orange-500" },
  { name: "Pink", value: "bg-pink-500" },
  { name: "Cyan", value: "bg-cyan-500" },
]

export function SegmentsView({ initialSegments }: SegmentsViewProps) {
  const [segments, setSegments] = useState<SegmentWithCount[]>(initialSegments)
  const [isPending, startTransition] = useTransition()
  const [isCreateOpen, setIsCreateOpen] = useState(false)
  const [newSegment, setNewSegment] = useState({
    name: "",
    description: "",
    color: "bg-blue-500",
  })

  const handleCreate = () => {
    if (!newSegment.name.trim()) {
      toast.error("Please enter a segment name")
      return
    }

    startTransition(async () => {
      try {
        const segment = await createSegment({
          name: newSegment.name,
          description: newSegment.description || undefined,
          color: newSegment.color,
        })
        setSegments((prev) => [{ ...segment, memberCount: 0 }, ...prev])
        setNewSegment({ name: "", description: "", color: "bg-blue-500" })
        setIsCreateOpen(false)
        toast.success("Segment created")
      } catch {
        toast.error("Failed to create segment")
      }
    })
  }

  const handleDelete = (segmentId: string) => {
    startTransition(async () => {
      try {
        await deleteSegment(segmentId)
        setSegments((prev) => prev.filter((s) => s.id !== segmentId))
        toast.success("Segment deleted")
      } catch {
        toast.error("Failed to delete segment")
      }
    })
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">Customer Segments</h3>
          <p className="text-sm text-muted-foreground">
            Organize contacts into groups for targeted outreach
          </p>
        </div>
        <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4" />
              New Segment
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create Segment</DialogTitle>
              <DialogDescription>
                Create a new segment to organize your contacts.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label>Name</Label>
                <Input
                  value={newSegment.name}
                  onChange={(e) =>
                    setNewSegment((prev) => ({ ...prev, name: e.target.value }))
                  }
                  placeholder="e.g., VIP Customers"
                />
              </div>

              <div className="space-y-2">
                <Label>Description (optional)</Label>
                <Textarea
                  value={newSegment.description}
                  onChange={(e) =>
                    setNewSegment((prev) => ({ ...prev, description: e.target.value }))
                  }
                  placeholder="What is this segment for?"
                  rows={3}
                />
              </div>

              <div className="space-y-2">
                <Label>Color</Label>
                <div className="flex gap-2">
                  {colorOptions.map((color) => (
                    <button
                      key={color.value}
                      type="button"
                      onClick={() =>
                        setNewSegment((prev) => ({ ...prev, color: color.value }))
                      }
                      className={`h-8 w-8 rounded-full ${color.value} ${
                        newSegment.color === color.value
                          ? "ring-2 ring-offset-2 ring-foreground"
                          : ""
                      }`}
                      title={color.name}
                    />
                  ))}
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsCreateOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleCreate} disabled={isPending}>
                {isPending && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                Create
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {segments.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16">
            <Folders className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold">No segments yet</h3>
            <p className="mt-1 text-sm text-muted-foreground text-center max-w-sm">
              Create segments to organize your contacts into meaningful groups for targeted campaigns.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {segments.map((segment) => (
            <Card key={segment.id} className="group relative">
              <CardHeader className="pb-2">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-2">
                    <div className={`h-4 w-4 rounded-full ${segment.color || "bg-gray-500"}`} />
                    <CardTitle className="text-base">{segment.name}</CardTitle>
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
                        onClick={() => handleDelete(segment.id)}
                      >
                        <Trash2 className="h-4 w-4 mr-2" />
                        Delete
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </CardHeader>
              <CardContent>
                {segment.description && (
                  <p className="text-sm text-muted-foreground mb-3 line-clamp-2">
                    {segment.description}
                  </p>
                )}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Users className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm font-medium">{segment.memberCount}</span>
                    <span className="text-xs text-muted-foreground">contacts</span>
                  </div>
                  <Badge variant={segment.isDynamic ? "default" : "secondary"} className="text-xs">
                    {segment.isDynamic ? "Dynamic" : "Static"}
                  </Badge>
                </div>
                {segment.lastCalculatedAt && (
                  <p className="text-xs text-muted-foreground mt-2">
                    Updated {format(new Date(segment.lastCalculatedAt), "MMM d, yyyy")}
                  </p>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}