import { cookies } from "next/headers"
import { redirect } from "next/navigation"
import { SidebarProvider } from "@/providers/sidebar-provider"
import { Sidebar, MobileSidebarTrigger } from "@/components/layout/sidebar"
import { auth } from "@/lib/auth"
import { db } from "@/lib/db"
import { user } from "@/lib/db/schema"
import { eq } from "drizzle-orm"

async function getCurrentUser() {
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

  return dbUser
}

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const currentUser = await getCurrentUser()

  return (
    <SidebarProvider>
      <div className="flex h-screen overflow-hidden bg-background">
        <Sidebar isSuperadmin={currentUser?.isSuperadmin ?? false} />
        <div className="flex flex-1 flex-col overflow-hidden">
          {/* Mobile Header */}
          <header className="flex h-16 shrink-0 items-center gap-4 border-b px-4 lg:hidden">
            <MobileSidebarTrigger />
            <span className="font-semibold">members.axxes.club</span>
          </header>
          <main className="flex-1 overflow-y-auto">
            <div className="container mx-auto p-6 lg:p-8">{children}</div>
          </main>
        </div>
      </div>
    </SidebarProvider>
  )
}
