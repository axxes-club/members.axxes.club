import { getCampaignStats } from "@/lib/actions/newsletter"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { 
  ArrowLeft,
  Send,
  Clock,
  Users,
  Mail,
  MousePointer,
  Eye,
  AlertTriangle,
  ExternalLink,
  Calendar
} from "lucide-react"
import Link from "next/link"
import { format, formatDistanceToNow } from "date-fns"
import { notFound } from "next/navigation"
import { SendCampaignButton } from "./send-campaign-button"

export default async function CampaignDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  
  try {
    const stats = await getCampaignStats(id)

    return (
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" asChild>
              <Link href="/newsletter/campaigns">
                <ArrowLeft className="h-4 w-4" />
              </Link>
            </Button>
            <div>
              <div className="flex items-center gap-3">
                <h1 className="text-3xl font-bold tracking-tight">
                  {stats.campaign.name}
                </h1>
                <CampaignStatusBadge status={stats.campaign.status} />
              </div>
              <p className="text-muted-foreground">{stats.campaign.subject}</p>
            </div>
          </div>
          <div className="flex gap-2">
            {stats.campaign.status === "draft" && (
              <>
                <Button variant="outline" asChild>
                  <Link href={`/newsletter/campaigns/${id}/edit`}>Edit</Link>
                </Button>
                <SendCampaignButton campaignId={id} />
              </>
            )}
            {stats.campaign.status === "scheduled" && (
              <Button variant="outline">
                Cancel Schedule
              </Button>
            )}
          </div>
        </div>

        {/* Stats Grid */}
        {stats.campaign.status === "sent" && (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
            <Card>
              <CardHeader className="pb-2">
                <CardDescription>Sent</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats.campaign.sentCount ?? 0}</div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardDescription>Delivered</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats.campaign.deliveredCount ?? 0}</div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardDescription className="flex items-center gap-1">
                  <Eye className="h-3 w-3" /> Open Rate
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats.openRate.toFixed(1)}%</div>
                <p className="text-xs text-muted-foreground">
                  {stats.campaign.openedCount ?? 0} opens
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardDescription className="flex items-center gap-1">
                  <MousePointer className="h-3 w-3" /> Click Rate
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats.clickRate.toFixed(1)}%</div>
                <p className="text-xs text-muted-foreground">
                  {stats.campaign.clickedCount ?? 0} clicks
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardDescription className="flex items-center gap-1">
                  <AlertTriangle className="h-3 w-3" /> Bounce Rate
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats.bounceRate.toFixed(1)}%</div>
                <p className="text-xs text-muted-foreground">
                  {stats.campaign.bouncedCount ?? 0} bounces
                </p>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Main Content */}
        <div className="grid gap-6 lg:grid-cols-3">
          {/* Campaign Details */}
          <div className="lg:col-span-2 space-y-6">
            {/* Campaign Info */}
            <Card>
              <CardHeader>
                <CardTitle>Campaign Details</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-4 md:grid-cols-2">
                  <div>
                    <p className="text-sm text-muted-foreground">From</p>
                    <p className="font-medium">
                      {stats.campaign.fromName
                        ? `${stats.campaign.fromName} <${stats.campaign.fromEmail}>`
                        : stats.campaign.fromEmail || "Default sender"}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Reply-To</p>
                    <p className="font-medium">{stats.campaign.replyTo || "Not set"}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Created</p>
                    <p className="font-medium">
                      {format(new Date(stats.campaign.createdAt), "PPP 'at' p")}
                    </p>
                  </div>
                  {stats.campaign.sentAt && (
                    <div>
                      <p className="text-sm text-muted-foreground">Sent</p>
                      <p className="font-medium">
                        {format(new Date(stats.campaign.sentAt), "PPP 'at' p")}
                      </p>
                    </div>
                  )}
                  {stats.campaign.scheduledAt && (
                    <div>
                      <p className="text-sm text-muted-foreground">Scheduled</p>
                      <p className="font-medium flex items-center gap-2">
                        <Calendar className="h-4 w-4" />
                        {format(new Date(stats.campaign.scheduledAt), "PPP 'at' p")}
                      </p>
                    </div>
                  )}
                </div>
                
                {stats.campaign.previewText && (
                  <div>
                    <p className="text-sm text-muted-foreground">Preview Text</p>
                    <p>{stats.campaign.previewText}</p>
                  </div>
                )}

                <div>
                  <p className="text-sm text-muted-foreground">Tracking</p>
                  <div className="flex gap-2 mt-1">
                    {stats.campaign.openTrackingEnabled && (
                      <Badge variant="secondary">Open tracking</Badge>
                    )}
                    {stats.campaign.clickTrackingEnabled && (
                      <Badge variant="secondary">Click tracking</Badge>
                    )}
                    {!stats.campaign.openTrackingEnabled && !stats.campaign.clickTrackingEnabled && (
                      <span className="text-muted-foreground">Disabled</span>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Link Performance (if sent with click tracking) */}
            {stats.campaign.status === "sent" && stats.links.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle>Link Performance</CardTitle>
                  <CardDescription>Click statistics for tracked links</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {stats.links.map((link) => (
                      <div key={link.id} className="flex items-center justify-between">
                        <div className="flex-1 min-w-0 mr-4">
                          <a
                            href={link.originalUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-sm font-medium hover:underline truncate block"
                          >
                            {link.originalUrl}
                          </a>
                          <p className="text-xs text-muted-foreground">
                            {link.clickCount ?? 0} clicks ({link.uniqueClickCount ?? 0} unique)
                          </p>
                        </div>
                        <ExternalLink className="h-4 w-4 text-muted-foreground" />
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Recent Opens */}
            {stats.campaign.status === "sent" && stats.recentOpens.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle>Recent Opens</CardTitle>
                  <CardDescription>Last 20 opens</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {stats.recentOpens.map((open) => (
                      <div key={open.id} className="flex items-center justify-between text-sm">
                        <div>
                          <span className="font-medium">
                            {open.contact?.email || "Unknown"}
                          </span>
                          {open.contact?.firstName && (
                            <span className="text-muted-foreground">
                              {" "}
                              ({open.contact.firstName} {open.contact.lastName})
                            </span>
                          )}
                        </div>
                        <span className="text-muted-foreground">
                          {formatDistanceToNow(new Date(open.occurredAt), { addSuffix: true })}
                        </span>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Targeting */}
            <Card>
              <CardHeader>
                <CardTitle>Targeting</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {stats.campaign.listIds && stats.campaign.listIds.length > 0 ? (
                    <div>
                      <p className="text-sm text-muted-foreground mb-2">Lists</p>
                      <p className="font-medium">
                        {stats.campaign.listIds.length} list{stats.campaign.listIds.length > 1 ? "s" : ""} selected
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {stats.campaign.totalRecipients ?? 0} total recipients
                      </p>
                    </div>
                  ) : (
                    <p className="text-muted-foreground">No lists selected</p>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Event Summary */}
            {stats.campaign.status === "sent" && (
              <Card>
                <CardHeader>
                  <CardTitle>Event Summary</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Sent</span>
                      <span className="font-medium">{stats.eventCounts.sent ?? 0}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Delivered</span>
                      <span className="font-medium">{stats.eventCounts.delivered ?? 0}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Opened</span>
                      <span className="font-medium">{stats.eventCounts.opened ?? 0}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Clicked</span>
                      <span className="font-medium">{stats.eventCounts.clicked ?? 0}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Bounced</span>
                      <span className="font-medium">{stats.eventCounts.bounced ?? 0}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Unsubscribed</span>
                      <span className="font-medium">{stats.eventCounts.unsubscribed ?? 0}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Complained</span>
                      <span className="font-medium">{stats.eventCounts.complained ?? 0}</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>
    )
  } catch (error) {
    notFound()
  }
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
    <Badge className={styles[status] || styles.draft}>
      {status}
    </Badge>
  )
}