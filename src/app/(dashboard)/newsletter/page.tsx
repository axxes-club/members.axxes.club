import { redirect } from "next/navigation"
import { getNewsletterDashboardStats, getSubscriberLists, getCampaigns } from "@/lib/actions/newsletter"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { 
  Mail, 
  Users, 
  Send, 
  TrendingUp, 
  Clock, 
  FileEdit,
  ArrowRight,
  List
} from "lucide-react"
import Link from "next/link"

export default async function NewsletterPage() {
  const [stats, lists, campaigns] = await Promise.all([
    getNewsletterDashboardStats(),
    getSubscriberLists(),
    getCampaigns(),
  ])

  const recentCampaigns = campaigns.slice(0, 5)

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Newsletter</h1>
          <p className="text-muted-foreground">
            Manage your email campaigns and subscriber lists
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" asChild>
            <Link href="/newsletter/lists/new">
              <Users className="mr-2 h-4 w-4" />
              New List
            </Link>
          </Button>
          <Button asChild>
            <Link href="/newsletter/campaigns/new">
              <Send className="mr-2 h-4 w-4" />
              New Campaign
            </Link>
          </Button>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Subscribers</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.lists.totalSubscribers.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">
              across {stats.lists.total} list{stats.lists.total !== 1 ? "s" : ""}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Emails Sent</CardTitle>
            <Mail className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.emails.totalSent.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">
              {stats.campaigns.sent} campaigns sent
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Open Rate</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.emails.avgOpenRate.toFixed(1)}%</div>
            <p className="text-xs text-muted-foreground">
              {stats.emails.totalOpened.toLocaleString()} opens
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Click Rate</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.emails.avgClickRate.toFixed(1)}%</div>
            <p className="text-xs text-muted-foreground">
              {stats.emails.totalClicked.toLocaleString()} clicks
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Main Content */}
      <div className="grid gap-6 md:grid-cols-2">
        {/* Recent Campaigns */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Recent Campaigns</CardTitle>
                <CardDescription>Your latest email campaigns</CardDescription>
              </div>
              <Button variant="ghost" size="sm" asChild>
                <Link href="/newsletter/campaigns">
                  View all
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {recentCampaigns.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-8 text-center">
                <Mail className="h-12 w-12 text-muted-foreground/50" />
                <p className="mt-4 text-sm text-muted-foreground">No campaigns yet</p>
                <Button className="mt-4" asChild>
                  <Link href="/newsletter/campaigns/new">Create your first campaign</Link>
                </Button>
              </div>
            ) : (
              <div className="space-y-4">
                {recentCampaigns.map((campaign) => (
                  <Link
                    key={campaign.id}
                    href={`/newsletter/campaigns/${campaign.id}`}
                    className="flex items-center justify-between rounded-lg border p-3 transition-colors hover:bg-muted/50"
                  >
                    <div className="space-y-1">
                      <p className="font-medium">{campaign.name}</p>
                      <p className="text-sm text-muted-foreground">{campaign.subject}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <CampaignStatusBadge status={campaign.status} />
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Subscriber Lists */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Subscriber Lists</CardTitle>
                <CardDescription>Manage your subscriber segments</CardDescription>
              </div>
              <Button variant="ghost" size="sm" asChild>
                <Link href="/newsletter/lists">
                  View all
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {lists.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-8 text-center">
                <List className="h-12 w-12 text-muted-foreground/50" />
                <p className="mt-4 text-sm text-muted-foreground">No lists yet</p>
                <Button className="mt-4" asChild>
                  <Link href="/newsletter/lists/new">Create your first list</Link>
                </Button>
              </div>
            ) : (
              <div className="space-y-4">
                {lists.slice(0, 5).map((list) => (
                  <Link
                    key={list.id}
                    href={`/newsletter/lists/${list.id}`}
                    className="flex items-center justify-between rounded-lg border p-3 transition-colors hover:bg-muted/50"
                  >
                    <div className="space-y-1">
                      <p className="font-medium">{list.name}</p>
                      <p className="text-sm text-muted-foreground">
                        {list.subscriberCount ?? 0} subscriber{list.subscriberCount !== 1 ? "s" : ""}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-muted-foreground">
                        /{list.slug}
                      </span>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle>Quick Actions</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-4">
            <Button variant="outline" className="h-auto flex-col gap-2 py-4" asChild>
              <Link href="/newsletter/campaigns">
                <Mail className="h-6 w-6" />
                <span>View Campaigns</span>
                <span className="text-xs text-muted-foreground">
                  {stats.campaigns.total} total
                </span>
              </Link>
            </Button>
            <Button variant="outline" className="h-auto flex-col gap-2 py-4" asChild>
              <Link href="/newsletter/lists">
                <Users className="h-6 w-6" />
                <span>Manage Lists</span>
                <span className="text-xs text-muted-foreground">
                  {stats.lists.total} lists
                </span>
              </Link>
            </Button>
            <Button variant="outline" className="h-auto flex-col gap-2 py-4" asChild>
              <Link href="/newsletter/templates">
                <FileEdit className="h-6 w-6" />
                <span>Email Templates</span>
                <span className="text-xs text-muted-foreground">
                  Create reusable templates
                </span>
              </Link>
            </Button>
            <Button variant="outline" className="h-auto flex-col gap-2 py-4" asChild>
              <Link href="/newsletter/settings">
                <Clock className="h-6 w-6" />
                <span>Settings</span>
                <span className="text-xs text-muted-foreground">
                  Configure email provider
                </span>
              </Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

function CampaignStatusBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    draft: "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300",
    scheduled: "bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300",
    sending: "bg-yellow-100 text-yellow-700 dark:bg-yellow-900 dark:text-yellow-300",
    sent: "bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300",
    failed: "bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300",
    cancelled: "bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400",
  }

  return (
    <span className={`rounded-full px-2 py-1 text-xs font-medium ${styles[status] || styles.draft}`}>
      {status}
    </span>
  )
}