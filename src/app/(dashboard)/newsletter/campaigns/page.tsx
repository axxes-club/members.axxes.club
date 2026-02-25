import { getCampaigns } from "@/lib/actions/newsletter"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { 
  Mail, 
  Plus, 
  MoreHorizontal,
  Send,
  Clock,
  FileEdit,
  AlertCircle,
  CheckCircle,
  Users
} from "lucide-react"
import Link from "next/link"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { formatDistanceToNow } from "date-fns"
import { Badge } from "@/components/ui/badge"

export default async function CampaignsPage() {
  const campaigns = await getCampaigns()

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Campaigns</h1>
          <p className="text-muted-foreground">
            Create and send email campaigns to your subscribers
          </p>
        </div>
        <Button asChild>
          <Link href="/newsletter/campaigns/new">
            <Plus className="mr-2 h-4 w-4" />
            New Campaign
          </Link>
        </Button>
      </div>

      {/* Campaigns List */}
      {campaigns.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Mail className="h-12 w-12 text-muted-foreground/50" />
            <h3 className="mt-4 text-lg font-semibold">No campaigns yet</h3>
            <p className="mt-2 text-sm text-muted-foreground text-center max-w-md">
              Create your first email campaign to start engaging with your subscribers.
            </p>
            <Button className="mt-4" asChild>
              <Link href="/newsletter/campaigns/new">Create your first campaign</Link>
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {campaigns.map((campaign) => (
            <Card key={campaign.id} className="relative group">
              <CardContent className="p-6">
                <div className="flex items-start justify-between">
                  <div className="space-y-3 flex-1">
                    {/* Header Row */}
                    <div className="flex items-center gap-3">
                      <CampaignStatusIcon status={campaign.status} />
                      <div>
                        <h3 className="font-semibold text-lg">{campaign.name}</h3>
                        <p className="text-sm text-muted-foreground">{campaign.subject}</p>
                      </div>
                      <CampaignStatusBadge status={campaign.status} />
                    </div>

                    {/* Stats Row */}
                    {campaign.status === "sent" && (
                      <div className="flex items-center gap-6 text-sm">
                        <div className="flex items-center gap-1.5 text-muted-foreground">
                          <Send className="h-4 w-4" />
                          <span>{campaign.sentCount ?? 0} sent</span>
                        </div>
                        <div className="flex items-center gap-1.5 text-muted-foreground">
                          <Mail className="h-4 w-4" />
                          <span>
                            {campaign.sentCount && campaign.sentCount > 0
                              ? ((campaign.openedCount ?? 0) / campaign.sentCount * 100).toFixed(1)
                              : "0"}
                            % opened
                          </span>
                        </div>
                        <div className="flex items-center gap-1.5 text-muted-foreground">
                          <Users className="h-4 w-4" />
                          <span>
                            {campaign.sentCount && campaign.sentCount > 0
                              ? ((campaign.clickedCount ?? 0) / campaign.sentCount * 100).toFixed(1)
                              : "0"}
                            % clicked
                          </span>
                        </div>
                      </div>
                    )}

                    {/* Meta Row */}
                    <div className="flex items-center gap-4 text-xs text-muted-foreground">
                      {campaign.scheduledAt && campaign.status === "scheduled" && (
                        <span className="flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          Scheduled {formatDistanceToNow(new Date(campaign.scheduledAt), { addSuffix: true })}
                        </span>
                      )}
                      {campaign.sentAt && campaign.status === "sent" && (
                        <span>Sent {formatDistanceToNow(new Date(campaign.sentAt), { addSuffix: true })}</span>
                      )}
                      <span>Created {formatDistanceToNow(new Date(campaign.createdAt), { addSuffix: true })}</span>
                      {campaign.listIds && campaign.listIds.length > 0 && (
                        <span>{campaign.listIds.length} list{campaign.listIds.length > 1 ? "s" : ""}</span>
                      )}
                    </div>
                  </div>

                  {/* Actions */}
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-8 w-8">
                        <MoreHorizontal className="h-4 w-4" />
                        <span className="sr-only">Open menu</span>
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem asChild>
                        <Link href={`/newsletter/campaigns/${campaign.id}`}>
                          {campaign.status === "draft" ? "Edit campaign" : "View details"}
                        </Link>
                      </DropdownMenuItem>
                      {campaign.status === "draft" && (
                        <DropdownMenuItem asChild>
                          <Link href={`/newsletter/campaigns/${campaign.id}/preview`}>
                            Preview
                          </Link>
                        </DropdownMenuItem>
                      )}
                      {campaign.status === "scheduled" && (
                        <DropdownMenuItem className="text-destructive">
                          Cancel schedule
                        </DropdownMenuItem>
                      )}
                      {campaign.status === "draft" && (
                        <DropdownMenuItem className="text-destructive">
                          Delete
                        </DropdownMenuItem>
                      )}
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </CardContent>
              <Link
                href={`/newsletter/campaigns/${campaign.id}`}
                className="absolute inset-0"
                prefetch={false}
              >
                <span className="sr-only">View {campaign.name}</span>
              </Link>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}

function CampaignStatusIcon({ status }: { status: string }) {
  switch (status) {
    case "draft":
      return <FileEdit className="h-5 w-5 text-gray-500" />
    case "scheduled":
      return <Clock className="h-5 w-5 text-blue-500" />
    case "sending":
      return <Send className="h-5 w-5 text-yellow-500 animate-pulse" />
    case "sent":
      return <CheckCircle className="h-5 w-5 text-green-500" />
    case "failed":
      return <AlertCircle className="h-5 w-5 text-red-500" />
    default:
      return <Mail className="h-5 w-5 text-gray-500" />
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