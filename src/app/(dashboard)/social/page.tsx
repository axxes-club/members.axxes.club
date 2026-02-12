import { PageHeader } from "@/components/layout/page-header"
import { SectionHeader } from "@/components/layout/section-header"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Plus, Instagram, Twitter, Facebook, Linkedin, Share2 } from "lucide-react"
import { getSocialAccounts, getSocialStats, getScheduledPosts } from "@/lib/actions/social"

export default async function SocialPage() {
  const [accounts, stats, scheduledPosts] = await Promise.all([
    getSocialAccounts(),
    getSocialStats(),
    getScheduledPosts(),
  ])

  function getPlatformIcon(platform: string) {
    switch (platform) {
      case "instagram":
        return <Instagram className="h-5 w-5" />
      case "twitter":
      case "x":
        return <Twitter className="h-5 w-5" />
      case "facebook":
        return <Facebook className="h-5 w-5" />
      case "linkedin":
        return <Linkedin className="h-5 w-5" />
      default:
        return <Share2 className="h-5 w-5" />
    }
  }

  function formatFollowers(count: number | null | undefined) {
    if (!count) return "0"
    if (count >= 1000000) return `${(count / 1000000).toFixed(1)}M`
    if (count >= 1000) return `${(count / 1000).toFixed(1)}K`
    return count.toString()
  }

  return (
    <div className="space-y-8">
      <PageHeader
        heading="Social Media"
        description="Manage your social media presence"
        actions={
          <Button>
            <Plus className="h-4 w-4" />
            Connect Account
          </Button>
        }
      />

      {/* Stats */}
      <div className="grid gap-4 sm:grid-cols-3">
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold">{stats.totalAccounts}</div>
            <p className="text-sm text-muted-foreground">Connected Accounts</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold">{formatFollowers(stats.totalFollowers)}</div>
            <p className="text-sm text-muted-foreground">Total Followers</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold">{stats.totalPosts}</div>
            <p className="text-sm text-muted-foreground">Posts Created</p>
          </CardContent>
        </Card>
      </div>

      <SectionHeader
        number="01"
        title="Connected Accounts"
        description="Manage your social media connections"
      />

      {accounts.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-muted">
              <Share2 className="h-8 w-8 text-muted-foreground" />
            </div>
            <h3 className="mt-4 text-lg font-semibold">No connected accounts</h3>
            <p className="mt-1 text-sm text-muted-foreground text-center max-w-sm">
              Connect your social media accounts to manage posts, track analytics, and grow your audience.
            </p>
            <div className="mt-6 flex gap-3">
              <Button>
                <Instagram className="h-4 w-4" />
                Connect Instagram
              </Button>
              <Button variant="outline">
                <Twitter className="h-4 w-4" />
                Connect X
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {accounts.map((account) => (
            <Card key={account.id}>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <div className="flex items-center gap-2">
                  {getPlatformIcon(account.platform)}
                  <span className="font-medium capitalize">{account.platform}</span>
                </div>
                <Badge variant={account.isActive ? "success" : "secondary"}>
                  {account.isActive ? "Connected" : "Disconnected"}
                </Badge>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground mb-2">{account.username}</p>
                <p className="text-2xl font-bold mb-1">
                  {formatFollowers(account.followersCount)}
                </p>
                <p className="text-xs text-muted-foreground">followers</p>
                {account.statsUpdatedAt && (
                  <p className="text-xs text-muted-foreground mt-4">
                    Last synced {new Date(account.statsUpdatedAt).toLocaleDateString()}
                  </p>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <SectionHeader
        number="02"
        title="Scheduled Posts"
        description="Upcoming social media content"
      />

      {scheduledPosts.length === 0 ? (
        <Card>
          <CardContent className="p-6 text-center text-muted-foreground">
            <p>No scheduled posts</p>
            <Button variant="outline" className="mt-4">
              <Plus className="h-4 w-4" />
              Create Post
            </Button>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="p-0">
            <div className="divide-y">
              {scheduledPosts.map((post) => (
                <div key={post.id} className="p-4">
                  <p className="font-medium line-clamp-2">{post.content}</p>
                  <p className="text-sm text-muted-foreground mt-2">
                    Scheduled for {post.scheduledFor ? new Date(post.scheduledFor).toLocaleString() : "—"}
                  </p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      <SectionHeader
        number="03"
        title="Recent Analytics"
        description="Performance overview"
      />

      <Card>
        <CardContent className="flex flex-col items-center justify-center py-12 text-muted-foreground">
          <p>Connect a social account to see analytics</p>
        </CardContent>
      </Card>
    </div>
  )
}
