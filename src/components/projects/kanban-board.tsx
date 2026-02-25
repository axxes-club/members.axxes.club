"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area"
import {
  Plus,
  MoreHorizontal,
  Calendar,
  Clock,
  User,
  Tag,
  CheckSquare,
  MessageSquare,
  GripVertical,
  Trash2,
  Edit,
  X,
} from "lucide-react"
import { format, isPast, isToday, differenceInDays } from "date-fns"
import {
  createCard,
  createList,
  updateCard,
  moveCard,
  deleteCard,
  deleteList,
  addLabelToCard,
  removeLabelFromCard,
  addMemberToCard,
  removeMemberFromCard,
} from "@/lib/actions/projects"
import { toast } from "sonner"

interface KanbanBoardProps {
  project: {
    id: string
    name: string
    labels: Array<{
      id: string
      name: string
      color: string
    }>
    members: Array<{
      id: string
      userId: string
      user: {
        id: string
        name: string | null
        email: string
        image: string | null
      }
    }>
    lists: Array<{
      id: string
      name: string
      color: string | null
      position: number
      cards: Array<{
        id: string
        title: string
        description: string | null
        position: number
        priority: string | null
        dueDate: Date | null
        completedAt: Date | null
        coverColor: string | null
        labels: Array<{
          label: {
            id: string
            name: string
            color: string
          }
        }>
        members: Array<{
          user: {
            id: string
            name: string | null
            email: string
            image: string | null
          }
        }>
        checklists: Array<{
          id: string
          title: string
          items: Array<{
            id: string
            text: string
            isCompleted: boolean
          }>
        }>
      }>
    }>
  }
}

export function KanbanBoard({ project }: KanbanBoardProps) {
  const router = useRouter()
  const [draggedCard, setDraggedCard] = React.useState<{
    id: string
    listId: string
  } | null>(null)
  const [isAddingList, setIsAddingList] = React.useState(false)
  const [newListName, setNewListName] = React.useState("")
  const [selectedCard, setSelectedCard] = React.useState<string | null>(null)

  // Drag and drop handlers
  const handleDragStart = (cardId: string, listId: string) => {
    setDraggedCard({ id: cardId, listId })
  }

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
  }

  const handleDrop = async (targetListId: string, position: number) => {
    if (!draggedCard) return

    if (draggedCard.listId !== targetListId) {
      try {
        await moveCard(draggedCard.id, targetListId, position)
        router.refresh()
      } catch (error) {
        toast.error("Failed to move card")
      }
    }

    setDraggedCard(null)
  }

  // Add list
  const handleAddList = async () => {
    if (!newListName.trim()) return

    try {
      await createList(project.id, { name: newListName })
      setNewListName("")
      setIsAddingList(false)
      router.refresh()
    } catch (error) {
      toast.error("Failed to create list")
    }
  }

  return (
    <div className="flex-1 overflow-hidden">
      <ScrollArea className="h-full">
        <div className="flex gap-4 p-1 min-h-full">
          {project.lists.map((list) => (
            <KanbanList
              key={list.id}
              list={list}
              projectId={project.id}
              labels={project.labels}
              members={project.members}
              onDragStart={handleDragStart}
              onDragOver={handleDragOver}
              onDrop={handleDrop}
              onRefresh={() => router.refresh()}
              selectedCard={selectedCard}
              onSelectCard={setSelectedCard}
            />
          ))}

          {/* Add List */}
          <div className="w-72 shrink-0">
            {isAddingList ? (
              <Card>
                <CardContent className="p-3">
                  <Input
                    placeholder="List name"
                    value={newListName}
                    onChange={(e) => setNewListName(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") handleAddList()
                      if (e.key === "Escape") setIsAddingList(false)
                    }}
                    autoFocus
                  />
                  <div className="flex gap-2 mt-2">
                    <Button size="sm" onClick={handleAddList}>
                      Add
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => setIsAddingList(false)}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ) : (
              <Button
                variant="ghost"
                className="w-full justify-start text-muted-foreground hover:bg-muted"
                onClick={() => setIsAddingList(true)}
              >
                <Plus className="h-4 w-4 mr-2" />
                Add list
              </Button>
            )}
          </div>
        </div>
        <ScrollBar orientation="horizontal" />
      </ScrollArea>
    </div>
  )
}

interface KanbanListProps {
  list: {
    id: string
    name: string
    color: string | null
    position: number
    cards: Array<{
      id: string
      title: string
      description: string | null
      position: number
      priority: string | null
      dueDate: Date | null
      completedAt: Date | null
      coverColor: string | null
      labels: Array<{
        label: {
          id: string
          name: string
          color: string
        }
      }>
      members: Array<{
        user: {
          id: string
          name: string | null
          email: string
          image: string | null
        }
      }>
      checklists: Array<{
        id: string
        title: string
        items: Array<{
          id: string
          text: string
          isCompleted: boolean
        }>
      }>
    }>
  }
  projectId: string
  labels: Array<{ id: string; name: string; color: string }>
  members: Array<{
    id: string
    userId: string
    user: { id: string; name: string | null; email: string; image: string | null }
  }>
  onDragStart: (cardId: string, listId: string) => void
  onDragOver: (e: React.DragEvent) => void
  onDrop: (listId: string, position: number) => void
  onRefresh: () => void
  selectedCard: string | null
  onSelectCard: (cardId: string | null) => void
}

function KanbanList({
  list,
  projectId,
  labels,
  members,
  onDragStart,
  onDragOver,
  onDrop,
  onRefresh,
  selectedCard,
  onSelectCard,
}: KanbanListProps) {
  const [isAddingCard, setIsAddingCard] = React.useState(false)
  const [newCardTitle, setNewCardTitle] = React.useState("")

  const handleAddCard = async () => {
    if (!newCardTitle.trim()) return

    try {
      await createCard(projectId, {
        title: newCardTitle,
        listId: list.id,
      })
      setNewCardTitle("")
      setIsAddingCard(false)
      onRefresh()
    } catch (error) {
      toast.error("Failed to create card")
    }
  }

  const handleDeleteList = async () => {
    if (!confirm("Are you sure you want to delete this list?")) return

    try {
      await deleteList(list.id)
      onRefresh()
    } catch (error) {
      toast.error("Failed to delete list")
    }
  }

  return (
    <div
      className="w-72 shrink-0"
      onDragOver={onDragOver}
      onDrop={() => onDrop(list.id, 0)}
    >
      <Card className="bg-muted/50">
        <CardHeader className="p-3 space-y-0">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              {list.color && (
                <div
                  className="w-3 h-3 rounded-full"
                  style={{ backgroundColor: list.color }}
                />
              )}
              <CardTitle className="text-sm font-medium">{list.name}</CardTitle>
              <span className="text-xs text-muted-foreground">
                {list.cards.length}
              </span>
            </div>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon-sm">
                  <MoreHorizontal className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem>
                  <Edit className="mr-2 h-4 w-4" />
                  Edit
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  className="text-destructive"
                  onClick={handleDeleteList}
                >
                  <Trash2 className="mr-2 h-4 w-4" />
                  Delete
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </CardHeader>
        <CardContent className="p-2 space-y-2">
          {list.cards.map((card) => (
            <KanbanCard
              key={card.id}
              card={card}
              listId={list.id}
              labels={labels}
              members={members}
              onDragStart={onDragStart}
              onRefresh={onRefresh}
              isSelected={selectedCard === card.id}
              onSelect={() => onSelectCard(card.id)}
            />
          ))}

          {/* Add Card */}
          {isAddingCard ? (
            <div className="space-y-2">
              <Textarea
                placeholder="Card title"
                value={newCardTitle}
                onChange={(e) => setNewCardTitle(e.target.value)}
                className="min-h-[60px]"
                autoFocus
              />
              <div className="flex gap-2">
                <Button size="sm" onClick={handleAddCard}>
                  Add
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => setIsAddingCard(false)}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </div>
          ) : (
            <Button
              variant="ghost"
              size="sm"
              className="w-full justify-start text-muted-foreground"
              onClick={() => setIsAddingCard(true)}
            >
              <Plus className="h-4 w-4 mr-2" />
              Add card
            </Button>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

interface KanbanCardProps {
  card: {
    id: string
    title: string
    description: string | null
    position: number
    priority: string | null
    dueDate: Date | null
    completedAt: Date | null
    coverColor: string | null
    labels: Array<{
      label: {
        id: string
        name: string
        color: string
      }
    }>
    members: Array<{
      user: {
        id: string
        name: string | null
        email: string
        image: string | null
      }
    }>
    checklists: Array<{
      id: string
      title: string
      items: Array<{
        id: string
        text: string
        isCompleted: boolean
      }>
    }>
  }
  listId: string
  labels: Array<{ id: string; name: string; color: string }>
  members: Array<{
    id: string
    userId: string
    user: { id: string; name: string | null; email: string; image: string | null }
  }>
  onDragStart: (cardId: string, listId: string) => void
  onRefresh: () => void
  isSelected: boolean
  onSelect: () => void
}

function KanbanCard({
  card,
  listId,
  labels,
  members,
  onDragStart,
  onRefresh,
  isSelected,
  onSelect,
}: KanbanCardProps) {
  const isOverdue =
    card.dueDate &&
    isPast(new Date(card.dueDate)) &&
    !card.completedAt
  const isDueToday =
    card.dueDate && isToday(new Date(card.dueDate))

  const completedChecklistItems = card.checklists.reduce(
    (acc, checklist) =>
      acc + checklist.items.filter((item) => item.isCompleted).length,
    0
  )
  const totalChecklistItems = card.checklists.reduce(
    (acc, checklist) => acc + checklist.items.length,
    0
  )

  return (
    <Card
      draggable
      onDragStart={() => onDragStart(card.id, listId)}
      onClick={onSelect}
      className={cn(
        "cursor-pointer hover:shadow-md transition-shadow",
        isSelected && "ring-2 ring-primary"
      )}
    >
      {/* Cover */}
      {card.coverColor && (
        <div
          className="h-16 rounded-t-lg"
          style={{ backgroundColor: card.coverColor }}
        />
      )}

      <CardContent className="p-2.5 space-y-2">
        {/* Labels */}
        {card.labels.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {card.labels.slice(0, 3).map(({ label }) => (
              <div
                key={label.id}
                className="px-2 py-0.5 rounded-full text-[10px] font-medium text-white"
                style={{ backgroundColor: label.color }}
                title={label.name}
              >
                {label.name}
              </div>
            ))}
            {card.labels.length > 3 && (
              <span className="text-[10px] text-muted-foreground">
                +{card.labels.length - 3}
              </span>
            )}
          </div>
        )}

        {/* Title */}
        <p className="text-sm font-medium line-clamp-2">{card.title}</p>

        {/* Meta */}
        <div className="flex items-center gap-2 text-muted-foreground text-xs">
          {/* Due Date */}
          {card.dueDate && (
            <div
              className={cn(
                "flex items-center gap-1 px-1.5 py-0.5 rounded",
                isOverdue && "bg-destructive/10 text-destructive",
                isDueToday && !isOverdue && "bg-yellow-500/10 text-yellow-600 dark:text-yellow-500"
              )}
            >
              <Calendar className="h-3 w-3" />
              {format(new Date(card.dueDate), "MMM d")}
            </div>
          )}

          {/* Checklist Progress */}
          {totalChecklistItems > 0 && (
            <div className={cn(
              "flex items-center gap-1",
              completedChecklistItems === totalChecklistItems && "text-green-500"
            )}>
              <CheckSquare className="h-3 w-3" />
              {completedChecklistItems}/{totalChecklistItems}
            </div>
          )}

          {/* Priority */}
          {card.priority && card.priority !== "medium" && (
            <Badge
              variant="outline"
              className={cn(
                "text-[10px]",
                card.priority === "urgent" && "border-red-500 text-red-500",
                card.priority === "high" && "border-orange-500 text-orange-500",
                card.priority === "low" && "border-slate-500 text-slate-500"
              )}
            >
              {card.priority}
            </Badge>
          )}
        </div>

        {/* Members */}
        {card.members.length > 0 && (
          <div className="flex -space-x-2 mt-2">
            {card.members.slice(0, 4).map(({ user }) => (
              <Avatar key={user.id} className="h-6 w-6 border-2 border-background">
                <AvatarImage src={user.image || undefined} />
                <AvatarFallback className="text-[10px]">
                  {user.name?.[0]?.toUpperCase() || user.email[0].toUpperCase()}
                </AvatarFallback>
              </Avatar>
            ))}
            {card.members.length > 4 && (
              <Avatar className="h-6 w-6 border-2 border-background">
                <AvatarFallback className="text-[10px]">
                  +{card.members.length - 4}
                </AvatarFallback>
              </Avatar>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  )
}