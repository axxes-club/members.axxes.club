export const dynamic = "force-dynamic"

import { notFound } from "next/navigation"
import Link from "next/link"
import { getProject, getProjectStats, createCard, createList, updateCard, moveCard, deleteCard } from "@/lib/actions/projects"
import { PageHeader } from "@/components/layout/page-header"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
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
  Settings,
  Trash2,
  Edit
} from "lucide-react"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { format, isPast, isToday } from "date-fns"
import { KanbanBoard } from "@/components/projects/kanban-board"

export default async function ProjectBoardPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params

  let project
  try {
    project = await getProject(id)
  } catch {
    notFound()
  }

  const stats = await getProjectStats(id)

  return (
    <div className="flex flex-col h-full">
      <PageHeader
        heading={project.name}
        description={project.description || undefined}
        actions={
          <div className="flex gap-2">
            <Button variant="outline" size="sm" asChild>
              <Link href={`/projects`}>
                Back to Projects
              </Link>
            </Button>
            <Button variant="outline" size="sm">
              <Settings className="h-4 w-4" />
            </Button>
          </div>
        }
      />

      {/* Stats Bar */}
      <div className="flex gap-4 mb-6 text-sm">
        <div className="flex items-center gap-2 text-muted-foreground">
          <span className="font-medium text-foreground">{stats.totalCards}</span>
          Total Tasks
        </div>
        <div className="flex items-center gap-2 text-muted-foreground">
          <span className="font-medium text-green-500">{stats.completedCards}</span>
          Completed
        </div>
        {stats.overdueCards > 0 && (
          <div className="flex items-center gap-2">
            <Badge variant="destructive">{stats.overdueCards} Overdue</Badge>
          </div>
        )}
        {project.dueDate && (
          <div className="flex items-center gap-1 text-muted-foreground ml-auto">
            <Calendar className="h-4 w-4" />
            Due {format(new Date(project.dueDate), "MMM d, yyyy")}
          </div>
        )}
      </div>

      {/* Kanban Board */}
      <KanbanBoard project={project as any} />
    </div>
  )
}