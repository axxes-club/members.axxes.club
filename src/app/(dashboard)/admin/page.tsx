import { redirect } from "next/navigation"
import { cookies } from "next/headers"
import { db } from "@/lib/db"
import { user, inviteCodes } from "@/lib/db/schema"
import { eq, desc } from "drizzle-orm"
import { auth } from "@/lib/auth"
import { PageHeader } from "@/components/layout/page-header"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { InviteCodesTable } from "./invite-codes-table"
import { UsersTable } from "./users-table"
import { CreateInviteCodeForm } from "./create-invite-code-form"

async function getSuperadminUser() {
  const cookieStore = await cookies()
  const cookieHeader = cookieStore
    .getAll()
    .map((c) => `${c.name}=${c.value}`)
    .join("; ")

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

  const [codes, users] = await Promise.all([
    db.query.inviteCodes.findMany({
      orderBy: [desc(inviteCodes.createdAt)],
    }),
    db.query.user.findMany({
      orderBy: [desc(user.createdAt)],
    }),
  ])

  return (
    <div className="space-y-8">
      <PageHeader
        heading="Admin Panel"
        description="Manage invite codes and users"
      />

      <div className="grid gap-8">
        {/* Invite Codes Section */}
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

        {/* Users Section */}
        <Card>
          <CardHeader>
            <CardTitle>Users</CardTitle>
            <CardDescription>
              Manage user accounts and permissions
            </CardDescription>
          </CardHeader>
          <CardContent>
            <UsersTable users={users} />
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
