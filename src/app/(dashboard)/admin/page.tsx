import { redirect } from "next/navigation"
export const dynamic = "force-dynamic"

import { db } from "@/lib/db"
import { user, inviteCodes } from "@/lib/db/schema"
import { eq, desc } from "drizzle-orm"
import { auth } from "@/lib/auth"
import { PageHeader } from "@/components/layout/page-header"
import { SectionHeader } from "@/components/layout/section-header"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { InviteCodesTable } from "./invite-codes-table"
import { UsersTable } from "./users-table"
import { BusinessesTable } from "./businesses-table"
import { ActivityTable } from "./activity-table"
import { CreateInviteCodeForm } from "./create-invite-code-form"
import { getAdminStats, getAllTenants, getLoginActivity } from "@/lib/actions/admin"
import { Users, Building2, Activity } from "lucide-react"
import { rawCookieHeader } from "@/lib/auth/raw-cookie"

async function getSuperadminUser() {
  const cookieHeader = await rawCookieHeader()

  const session = await auth.api.getSession({
    headers: new Headers({ cookie: cookieHeader }),
  })

  if (!session?.user) {
    redirect("/sign-in")
  }

  const dbUser = await db.query.user.findFirst({
    where: eq(user.id, session.user.id),
  })

  if (!dbUser?.isSuperadmin) {
    redirect("/dashboard")
  }

  return dbUser
}

export default async function AdminPage() {
  await getSuperadminUser()

  const [codes, users, stats, businesses, activities] = await Promise.all([
    db.query.inviteCodes.findMany({
      orderBy: [desc(inviteCodes.createdAt)],
    }),
    db.query.user.findMany({
      orderBy: [desc(user.createdAt)],
    }),
    getAdminStats(),
    getAllTenants(),
    getLoginActivity(25),
  ])

  return (
    <div className="space-y-8">
      <PageHeader
        heading="Admin Panel"
        description="Manage users, businesses, and system settings"
      />

      {/* Stats Overview */}
      <SectionHeader number="01" title="Overview" />
      <div className="grid gap-4 sm:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Total Users</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalUsers}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Total Businesses</CardTitle>
            <Building2 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalBusinesses}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Total Logins</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalLogins}</div>
          </CardContent>
        </Card>
      </div>

      {/* Businesses Section */}
      <SectionHeader number="02" title="Businesses" />
      <Card>
        <CardHeader>
          <CardTitle>All Businesses</CardTitle>
          <CardDescription>
            View and manage all registered businesses
          </CardDescription>
        </CardHeader>
        <CardContent>
          <BusinessesTable businesses={businesses} />
        </CardContent>
      </Card>

      {/* Login Activity Section */}
      <SectionHeader number="03" title="Login Activity" />
      <Card>
        <CardHeader>
          <CardTitle>Recent Activity</CardTitle>
          <CardDescription>
            Monitor user login activity across the platform
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ActivityTable activities={activities} />
        </CardContent>
      </Card>

      {/* Users Section */}
      <SectionHeader number="04" title="Users" />
      <Card>
        <CardHeader>
          <CardTitle>All Users</CardTitle>
          <CardDescription>
            Manage user accounts and permissions
          </CardDescription>
        </CardHeader>
        <CardContent>
          <UsersTable users={users} />
        </CardContent>
      </Card>

      {/* Invite Codes Section */}
      <SectionHeader number="05" title="Invite Codes" />
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Invite Codes</CardTitle>
              <CardDescription>
                Manage invite codes for new user registration
              </CardDescription>
            </div>
            <CreateInviteCodeForm />
          </div>
        </CardHeader>
        <CardContent>
          <InviteCodesTable codes={codes} />
        </CardContent>
      </Card>
    </div>
  )
}
