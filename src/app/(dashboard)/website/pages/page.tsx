import Link from "next/link"
import { PageHeader } from "@/components/layout/page-header"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Plus, FileText, Home, ExternalLink, Pencil, MoreVertical } from "lucide-react"
import { getPages, getPageStats } from "@/lib/actions/pages"
import { format } from "date-fns"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { PageActions } from "./page-actions"

export default async function WebsitePagesPage() {
  const [{ pages }, stats] = await Promise.all([
    getPages(),
    getPageStats(),
  ])

  return (
    <div className="space-y-8">
      <PageHeader
        heading="Website Pages"
        description="Create and manage your website pages"
        actions={
          <Link href="/website/pages/new">
            <Button>
              <Plus className="h-4 w-4" />
              New Page
            </Button>
          </Link>
        }
      />

      {/* Stats */}
      <div className="grid gap-4 sm:grid-cols-4">
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold">{stats.total}</div>
            <p className="text-sm text-muted-foreground">Total Pages</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold">{stats.published}</div>
            <p className="text-sm text-muted-foreground">Published</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold">{stats.draft}</div>
            <p className="text-sm text-muted-foreground">Drafts</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold">{stats.totalBlocks}</div>
            <p className="text-sm text-muted-foreground">Total Blocks</p>
          </CardContent>
        </Card>
      </div>

      {/* Pages List */}
      {pages.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-muted">
              <FileText className="h-8 w-8 text-muted-foreground" />
            </div>
            <h3 className="mt-4 text-lg font-semibold">No pages yet</h3>
            <p className="mt-1 text-sm text-muted-foreground text-center max-w-sm">
              Create your first page to start building your website.
            </p>
            <Link href="/website/pages/new" className="mt-6">
              <Button>
                <Plus className="h-4 w-4" />
                Create Page
              </Button>
            </Link>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {pages.map((page) => (
            <Card key={page.id} interactive>
              <CardContent className="flex items-center justify-between p-4">
                <Link href={`/website/pages/${page.id}`} className="flex items-center gap-4 flex-1">
                  <div className="flex h-10 w-10 items-center justify-center rounded-md bg-muted">
                    {page.isHomepage ? (
                      <Home className="h-5 w-5 text-primary" />
                    ) : (
                      <FileText className="h-5 w-5 text-muted-foreground" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-medium truncate">{page.title}</span>
                      {page.isHomepage && (
                        <Badge variant="secondary" className="shrink-0">Homepage</Badge>
                      )}
                    </div>
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <span>/{page.slug}</span>
                      <span>·</span>
                      <span>Updated {format(new Date(page.updatedAt), "MMM d, yyyy")}</span>
                    </div>
                  </div>
                </Link>
                <div className="flex items-center gap-2">
                  <Badge variant={page.isPublished ? "success" : "secondary"}>
                    {page.isPublished ? "Published" : "Draft"}
                  </Badge>
                  <PageActions page={page} />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
