import Link from "next/link"

export const dynamic = "force-dynamic"

import { PageHeader } from "@/components/layout/page-header"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Plus, FileText, Clock, CheckCircle, AlertCircle, Instagram, Twitter, Facebook, Linkedin, Share2 } from "lucide-react"
import { getPosts, getPostStats } from "@/lib/actions/social"
import { format } from "date-fns"

function getPlatformIcon(platform: string) {
  switch (platform) {
    case "instagram":
      return <Instagram className="h-4 w-4" />
    case "twitter":
    case "x":
      return <Twitter className="h-4 w-4" />
    case "facebook":
      return <Facebook className="h-4 w-4" />
    case "linkedin":
      return <Linkedin className="h-4 w-4" />
    default:
      return <Share2 className="h-4 w-4" />
  }
}

function getStatusBadge(status: string) {
  switch (status) {
    case "draft":
      return <Badge variant="secondary">Draft</Badge>
    case "scheduled":
      return <Badge variant="outline">Scheduled</Badge>
    case "published":
      return <Badge variant="success">Published</Badge>
    case "failed":
      return <Badge variant="destructive">Failed</Badge>
    default:
      return <Badge variant="secondary">{status}</Badge>
  }
}

export default async function PostsPage() {
  const [{ posts: allPosts }, stats] = await Promise.all([
    getPosts({ limit: 50 }),
    getPostStats(),
  ])

  const draftPosts = allPosts.filter((p) => p.status === "draft")
  const scheduledPosts = allPosts.filter((p) => p.status === "scheduled")
  const publishedPosts = allPosts.filter((p) => p.status === "published")
  const failedPosts = allPosts.filter((p) => p.status === "failed")

  return (
    <div className="space-y-8">
      <PageHeader
        heading="Posts"
        description="Create and manage your social media posts"
        actions={
          <Link href="/social/posts/new">
            <Button>
              <Plus className="h-4 w-4" />
              Create Post
            </Button>
          </Link>
        }
      />

      {/* Stats */}
      <div className="grid gap-4 sm:grid-cols-5">
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold">{stats.total}</div>
            <p className="text-sm text-muted-foreground">Total Posts</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <FileText className="h-4 w-4 text-muted-foreground" />
              <div className="text-2xl font-bold">{stats.drafts}</div>
            </div>
            <p className="text-sm text-muted-foreground">Drafts</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-muted-foreground" />
              <div className="text-2xl font-bold">{stats.scheduled}</div>
            </div>
            <p className="text-sm text-muted-foreground">Scheduled</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <CheckCircle className="h-4 w-4 text-green-500" />
              <div className="text-2xl font-bold">{stats.published}</div>
            </div>
            <p className="text-sm text-muted-foreground">Published</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <AlertCircle className="h-4 w-4 text-destructive" />
              <div className="text-2xl font-bold">{stats.failed}</div>
            </div>
            <p className="text-sm text-muted-foreground">Failed</p>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="all" className="space-y-6">
        <TabsList>
          <TabsTrigger value="all">All ({allPosts.length})</TabsTrigger>
          <TabsTrigger value="drafts">Drafts ({draftPosts.length})</TabsTrigger>
          <TabsTrigger value="scheduled">Scheduled ({scheduledPosts.length})</TabsTrigger>
          <TabsTrigger value="published">Published ({publishedPosts.length})</TabsTrigger>
          {failedPosts.length > 0 && (
            <TabsTrigger value="failed">Failed ({failedPosts.length})</TabsTrigger>
          )}
        </TabsList>

        <TabsContent value="all">
          <PostList posts={allPosts} />
        </TabsContent>
        <TabsContent value="drafts">
          <PostList posts={draftPosts} emptyMessage="No draft posts" />
        </TabsContent>
        <TabsContent value="scheduled">
          <PostList posts={scheduledPosts} emptyMessage="No scheduled posts" />
        </TabsContent>
        <TabsContent value="published">
          <PostList posts={publishedPosts} emptyMessage="No published posts" />
        </TabsContent>
        <TabsContent value="failed">
          <PostList posts={failedPosts} emptyMessage="No failed posts" />
        </TabsContent>
      </Tabs>
    </div>
  )
}

function PostList({
  posts,
  emptyMessage = "No posts yet",
}: {
  posts: Awaited<ReturnType<typeof getPosts>>["posts"]
  emptyMessage?: string
}) {
  if (posts.length === 0) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-16">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-muted">
            <FileText className="h-8 w-8 text-muted-foreground" />
          </div>
          <h3 className="mt-4 text-lg font-semibold">{emptyMessage}</h3>
          <p className="mt-1 text-sm text-muted-foreground text-center max-w-sm">
            Create your first post to start engaging with your audience.
          </p>
          <Link href="/social/posts/new" className="mt-6">
            <Button>
              <Plus className="h-4 w-4" />
              Create Post
            </Button>
          </Link>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-4">
      {posts.map((post) => (
        <Link key={post.id} href={`/social/posts/${post.id}`}>
          <Card interactive className="p-4">
            <div className="flex items-start gap-4">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-muted">
                {post.socialAccount && !Array.isArray(post.socialAccount)
                  ? getPlatformIcon((post.socialAccount as { platform: string }).platform)
                  : <Share2 className="h-4 w-4" />}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  {getStatusBadge(post.status)}
                  {post.socialAccount && !Array.isArray(post.socialAccount) && (
                    <span className="text-sm text-muted-foreground">
                      @{(post.socialAccount as { username?: string }).username || "account"}
                    </span>
                  )}
                </div>
                <p className="text-sm line-clamp-2 mb-2">
                  {post.content || <span className="italic text-muted-foreground">No content</span>}
                </p>
                <div className="flex items-center gap-4 text-xs text-muted-foreground">
                  {post.scheduledFor && (
                    <span>
                      Scheduled: {format(new Date(post.scheduledFor), "MMM d, yyyy 'at' h:mm a")}
                    </span>
                  )}
                  {post.publishedAt && (
                    <span>
                      Published: {format(new Date(post.publishedAt), "MMM d, yyyy 'at' h:mm a")}
                    </span>
                  )}
                  {!post.scheduledFor && !post.publishedAt && (
                    <span>
                      Created: {format(new Date(post.createdAt), "MMM d, yyyy")}
                    </span>
                  )}
                  {post.hashtags && post.hashtags.length > 0 && (
                    <span>{post.hashtags.length} hashtags</span>
                  )}
                </div>
              </div>
            </div>
          </Card>
        </Link>
      ))}
    </div>
  )
}
