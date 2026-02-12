import { SidebarProvider } from "@/providers/sidebar-provider"
import { Sidebar, MobileSidebarTrigger } from "@/components/layout/sidebar"

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <SidebarProvider>
      <div className="flex h-screen overflow-hidden bg-background">
        <Sidebar />
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
