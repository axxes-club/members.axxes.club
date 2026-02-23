import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { getTeamMembers, getInvitations, getTenant } from "@/lib/actions/settings"
import { TeamMembersList } from "../team-members-list"
import { InviteMemberDialog } from "../invite-member-dialog"
import { PendingInvitationsList } from "./pending-invitations-list"
import { Users, Mail, Shield } from "lucide-react"

export const dynamic = "force-dynamic"

export default async function TeamSettingsPage() {
  const [members, invitations, tenant] = await Promise.all([
    getTeamMembers(),
    getInvitations(),
    getTenant(),
  ])

  const memberCount = members.length
  const pendingCount = invitations.length

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Team</h1>
          <p className="text-muted-foreground">
            Manage team members, roles, and permissions for {tenant.name}.
          </p>
        </div>
        <InviteMemberDialog />
      </div>

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardContent className="flex items-center gap-4 p-6">
            <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-club/10">
              <Users className="h-6 w-6 text-club" />
            </div>
            <div>
              <p className="text-2xl font-bold">{memberCount}</p>
              <p className="text-sm text-muted-foreground">Team Members</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-4 p-6">
            <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-amber-500/10">
              <Mail className="h-6 w-6 text-amber-500" />
            </div>
            <div>
              <p className="text-2xl font-bold">{pendingCount}</p>
              <p className="text-sm text-muted-foreground">Pending Invitations</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-4 p-6">
            <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-emerald-500/10">
              <Shield className="h-6 w-6 text-emerald-500" />
            </div>
            <div>
              <p className="text-2xl font-bold">5</p>
              <p className="text-sm text-muted-foreground">Role Types</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Team Members */}
      <Card>
        <CardHeader>
          <CardTitle>Team Members</CardTitle>
          <CardDescription>
            People who have access to this workspace. Manage their roles and permissions.
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <TeamMembersList members={members} />
        </CardContent>
      </Card>

      {/* Pending Invitations */}
      {pendingCount > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Pending Invitations</CardTitle>
            <CardDescription>
              Invitations that have been sent but not yet accepted.
            </CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            <PendingInvitationsList invitations={invitations} />
          </CardContent>
        </Card>
      )}

      {/* Role Descriptions */}
      <Card>
        <CardHeader>
          <CardTitle>Role Permissions</CardTitle>
          <CardDescription>
            Understanding what each role can do in your workspace.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            <RoleCard
              role="Owner"
              description="Full access to everything. Can delete the workspace and transfer ownership."
              permissions={["All permissions", "Delete workspace", "Transfer ownership", "Manage billing"]}
            />
            <RoleCard
              role="Admin"
              description="Full access except ownership actions. Can manage team members."
              permissions={["Manage team", "Manage settings", "Create content", "View analytics"]}
            />
            <RoleCard
              role="Manager"
              description="Can manage content and view analytics. Cannot manage team settings."
              permissions={["Create content", "Edit content", "View analytics", "Manage inventory"]}
            />
            <RoleCard
              role="Member"
              description="Can create and edit content. Limited access to settings."
              permissions={["Create content", "Edit own content", "View dashboard"]}
            />
            <RoleCard
              role="Viewer"
              description="Read-only access. Can view content but cannot make changes."
              permissions={["View content", "View dashboard"]}
            />
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

function RoleCard({
  role,
  description,
  permissions,
}: {
  role: string
  description: string
  permissions: string[]
}) {
  return (
    <div className="rounded-lg border p-4">
      <h3 className="font-semibold">{role}</h3>
      <p className="mt-1 text-sm text-muted-foreground">{description}</p>
      <ul className="mt-3 space-y-1">
        {permissions.map((permission) => (
          <li key={permission} className="flex items-center gap-2 text-sm">
            <span className="h-1.5 w-1.5 rounded-full bg-club" />
            {permission}
          </li>
        ))}
      </ul>
    </div>
  )
}