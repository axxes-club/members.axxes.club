import { cookies } from "next/headers"
import { redirect } from "next/navigation"
import { Toaster } from "sonner"
import { SidebarProvider } from "@/providers/sidebar-provider"
import { BrandThemeProvider } from "@/providers/brand-theme-provider"
import { ThemeProvider } from "@/providers/theme-provider"
import { Sidebar, MobileSidebar, MobileSidebarTrigger } from "@/components/layout/sidebar"
import { VersionBadge } from "@/components/ui/version-badge"
import { auth } from "@/lib/auth"
import { db } from "@/lib/db"
import { user, brandProfiles, themeSettings, tenants } from "@/lib/db/schema"
import { eq } from "drizzle-orm"
import { getTotalUnreadCount } from "@/lib/actions/messaging"

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

async function getTenantData(tenantId: string | undefined) {
  if (!tenantId) return { tenant: null, brandProfile: null, themeSettings: null }

  const [tenant, brandProfile, themeSetting] = await Promise.all([
    db.query.tenants.findFirst({
      where: eq(tenants.id, tenantId),
    }),
    db.query.brandProfiles.findFirst({
      where: eq(brandProfiles.tenantId, tenantId),
    }),
    db.query.themeSettings.findFirst({
      where: eq(themeSettings.tenantId, tenantId),
    }),
  ])

  return { tenant: tenant || null, brandProfile: brandProfile || null, themeSettings: themeSetting || null }
}

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const cookieStore = await cookies()
  const tenantId = cookieStore.get("tenant_id")?.value

  const [currentUser, tenantData, unreadMessagesCount] = await Promise.all([
    getCurrentUser(),
    getTenantData(tenantId),
    tenantId ? getTotalUnreadCount().catch(() => 0) : Promise.resolve(0),
  ])

  return (
    <ThemeProvider
      attribute="class"
      defaultTheme="system"
      enableSystem
      disableTransitionOnChange
    >
      <SidebarProvider>
        <BrandThemeProvider
          brandProfile={tenantData.brandProfile}
          applyBrandColors={tenantData.themeSettings?.applyBrandColors ?? false}
        >
          <div className="flex h-screen overflow-hidden bg-background">
            <Sidebar
              tenantId={tenantId}
              tenantName={tenantData.tenant?.name}
              tenantLogo={tenantData.tenant?.logoUrl || undefined}
              isSuperadmin={currentUser?.isSuperadmin ?? false}
              unreadMessagesCount={unreadMessagesCount}
            />
            <MobileSidebar
              tenantId={tenantId}
              tenantName={tenantData.tenant?.name}
              tenantLogo={tenantData.tenant?.logoUrl || undefined}
              isSuperadmin={currentUser?.isSuperadmin ?? false}
              unreadMessagesCount={unreadMessagesCount}
            />
            <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
              {/* Mobile Header */}
              <header className="flex h-16 shrink-0 items-center gap-4 border-b px-4 lg:hidden">
                <MobileSidebarTrigger />
                <span className="font-semibold">axxes.<span className="text-purple-500">club</span></span>
              </header>
              <main className="flex-1 overflow-y-auto">
                <div className="container mx-auto p-6 lg:p-8">{children}</div>
              </main>
              <Toaster position="top-center" richColors />
            </div>
            <VersionBadge />
          </div>
        </BrandThemeProvider>
      </SidebarProvider>
    </ThemeProvider>
  )
}