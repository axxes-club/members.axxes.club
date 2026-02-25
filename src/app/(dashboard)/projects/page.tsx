import Link from "next/link"
export const dynamic = "force-dynamic"

import { PageHeader } from "@/components/layout/page-header"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { 
  Plus, 
  LayoutGrid, 
  Calendar, 
  MoreHorizontal,
  Archive,
  Trash2,
  Users,
} from "lucide-react"
import { getProjects, getProjectStats } from "@/lib/actions/projects"
import { format } from "date-fns"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Badge } from "@/components/ui/badge"
import { archiveProject, deleteProject } from "@/lib/actions/projects"

export default async function ProjectsPage({
  searchParams,
}: {
  searchParams: Promise<{ search?: string; status?: string }>
}) {
  const params = await searchParams
  const search = params.search
  const status = params.status as "active" | "archived" | "completed" | "on_hold" | "all" || "active"

  const { projects: projectList, total } = await getProjects({
    search,
    status,
  })

  // Get stats for each project
  const projectsWithStats = await Promise.all(
    projectList.map(async (project) => {
      try {
        const stats = await getProjectStats(project.id)
        return { ...project, stats }
      } catch {
        return { ...project, stats: { totalCards: 0, completedCards: 0, overdueCards: 0, totalLists: 0 } }
      }
    })
  )

  return (
    <div className="space-y-8">
      <PageHeader
        heading="Projects"
        description="Manage your projects and tasks with kanban boards"
        actions={
          <Link href="/projects/new">
            <Button>
              <Plus className="h-4 w-4" />
              New Project
            </Button>
          </Link>
        }
      />

      {/* Stats */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold">{total}</div>
            <p className="text-sm text-muted-foreground">Total Projects</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-green-500">
              {projectsWithStats.filter(p => p.status === "active").length}
            </div>
            <p className="text-sm text-muted-foreground">Active</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-blue-500">
              {projectsWithStats.reduce((acc, p) => acc + p.stats.totalCards, 0)}
            </div>
            <p className="text-sm text-muted-foreground">Total Tasks</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-orange-500">
              {projectsWithStats.reduce((acc, p) => acc + p.stats.overdueCards, 0)}
            </div>
            <p className="text-sm text-muted-foreground">Overdue Tasks</p>
          </CardContent>
        </Card>
      </div>

      {/* Project Grid */}
      {projectsWithStats.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-muted">
              <LayoutGrid className="h-8 w-8 text-muted-foreground" />
            </div>
            <h3 className="mt-4 text-lg font-semibold">No projects yet</h3>
            <p className="mt-1 text-sm text-muted-foreground text-center max-w-sm">
              Get started by creating your first project. You can use kanban boards to organize tasks and collaborate with your team.
            </p>
            <Link href="/projects/new" className="mt-6">
              <Button>
                <Plus className="h-4 w-4" />
                Create Project
              </Button>
            </Link>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {projectsWithStats.map((project) => (
            <Link key={project.id} href={`/projects/${project.id}`}>
              <Card className="hover:border-primary/50 transition-colors cursor-pointer group">
                <CardContent className="p-4">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <div
                        className="h-10 w-10 rounded-lg flex items-center justify-center text-white font-semibold"
                        style={{ backgroundColor: project.color || "#6366f1" }}
                      >
                        {project.icon || project.name.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <h3 className="font-semibold group-hover:text-primary transition-colors">
                          {project.name}
                        </h3>
                        <p className="text-xs text-muted-foreground">
                          {project.stats.totalCards} tasks • {project.stats.totalLists} lists
                        </p>
                      </div>
                    </div>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild onClick={(e) => e.preventDefault()}>
                        <Button variant="ghost" size="icon-sm">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem asChild>
                          <Link href={`/projects/${project.id}`}>
                            <LayoutGrid className="mr-2 h-4 w-4" />
                            View Board
                          </Link>
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          onClick={async (e) => {
                            e.preventDefault()
                            await archiveProject(project.id)
                          }}
                        >
                          <Archive className="mr-2 h-4 w-4" />
                          Archive
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          className="text-destructive"
                          onClick={async (e) => {
                            e.preventDefault()
                            if (confirm("Are you sure you want to delete this project?")) {
                              await deleteProject(project.id)
                            }
                          }}
                        >
                          <Trash2 className="mr-2 h-4 w-4" />
                          Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>

                  {project.description && (
                    <p className="mt-3 text-sm text-muted-foreground line-clamp-2">
                      {project.description}
                    </p>
                  )}

                  {/* Progress Bar */}
                  <div className="mt-4">
                    <div className="flex items-center justify-between text-xs text-muted-foreground mb-1">
                      <span>Progress</span>
                      <span>
                        {project.stats.completedCards}/{project.stats.totalCards} completed
                      </span>
                    </div>
                    <div className="h-2 bg-muted rounded-full overflow-hidden">
                      <div
                        className="h-full bg-primary rounded-full transition-all"
                        style={{
                          width: project.stats.totalCards > 0
                            ? `${(project.stats.completedCards / project.stats.totalCards) * 100}%`
                            : "0%",
                        }}
                      />
                    </div>
                  </div>

                  {/* Meta Info */}
                  <div className="mt-4 flex items-center gap-4 text-xs text-muted-foreground">
                    {project.dueDate && (
                      <div className="flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        <span>Due {format(new Date(project.dueDate), "MMM d")}</span>
                      </div>
                    )}
                    {project.stats.overdueCards > 0 && (
                      <Badge variant="destructive" className="text-xs">
                        {project.stats.overdueCards} overdue
                      </Badge>
                    )}
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}