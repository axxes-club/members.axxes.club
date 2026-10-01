import { StorageSummary } from "@/components/storage/storage-panel"
import { PageHeader } from "@/components/layout/page-header"
export const dynamic = "force-dynamic"

import { SectionHeader } from "@/components/layout/section-header"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Plug } from "lucide-react"
import { Button } from "@/components/ui/button"
import { getTenant, getTeamMembers, getInvitations } from "@/lib/actions/settings"
import { BusinessDetailsForm } from "./business-details-form"
import { TeamMembersList } from "./team-members-list"
import { InviteMemberDialog } from "./invite-member-dialog"

export default async function SettingsPage() {
  const [tenant, teamMembers, invitations] = await Promise.all([
    getTenant(),
    getTeamMembers(),
    getInvitations(),
  ])

  return (
    <div className="space-y-8">
      <PageHeader heading="Settings" description="Manage your account and preferences" />

      <SectionHeader number="01" title="Business Details" />

      <BusinessDetailsForm tenant={tenant} />

      <SectionHeader number="02" title="Team Members" />

      <Card>
        <CardContent className="p-0">
          <TeamMembersList members={teamMembers} />
          <div className="border-t p-4 flex items-center justify-between">
            <InviteMemberDialog />
            {invitations.length > 0 && (
              <p className="text-sm text-muted-foreground">
                {invitations.length} pending invitation{invitations.length > 1 ? "s" : ""}
              </p>
            )}
          </div>
        </CardContent>
      </Card>

      <StorageSummary tenantId={tenant.id} />

      <SectionHeader number="03" title="Billing" />

      <Card>
        <CardHeader>
          <CardTitle>Current Plan</CardTitle>
          <CardDescription>
            You are currently on the {tenant.subscriptionTier || "Free"} plan
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between rounded-lg border p-4">
            <div>
              <p className="font-medium capitalize">{tenant.subscriptionTier || "Free"} Plan</p>
              <p className="text-sm text-muted-foreground">
                {tenant.subscriptionTier === "free" || !tenant.subscriptionTier
                  ? "Basic features for small teams"
                  : "Full access to all features"}
              </p>
            </div>
            <Badge>Current</Badge>
          </div>
          <Button>Upgrade Plan</Button>
        </CardContent>
      </Card>

      <SectionHeader number="04" title="Integrations" />

      <div className="grid gap-4 sm:grid-cols-2">
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-base">Stripe</CardTitle>
              <Badge variant={tenant.stripeCustomerId ? "success" : "outline"}>
                {tenant.stripeCustomerId ? "Connected" : "Not Connected"}
              </Badge>
            </div>
            <CardDescription>Accept payments and manage subscriptions</CardDescription>
          </CardHeader>
          <CardContent>
            <Button variant="outline" size="sm">
              <Plug className="h-4 w-4" />
              {tenant.stripeCustomerId ? "Manage" : "Connect"}
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-base">afters.am</CardTitle>
              <Badge variant="outline">Not Connected</Badge>
            </div>
            <CardDescription>Sync events and ticketing data</CardDescription>
          </CardHeader>
          <CardContent>
            <Button variant="outline" size="sm">
              <Plug className="h-4 w-4" />
              Connect
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
