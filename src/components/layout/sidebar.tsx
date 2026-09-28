"use client"

import * as React from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { cn } from "@/lib/utils"
import { useSidebar } from "@/providers/sidebar-provider"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible"
import {
  LayoutDashboard,
  LayoutGrid,
  Users,
  Calendar,
  Package,
  ShoppingCart,
  Share2,
  Settings,
  PanelLeftClose,
  PanelLeft,
  ChevronDown,
  ChevronRight,
  LogOut,
  Menu,
  Shield,
  Palette,
  UserCog,
  CreditCard,
  Plug,
  Bell,
  Megaphone,
  Search,
  FileImage,
  SunMoon,
  Sun,
  Moon,
  Monitor,
  Globe,
  FileText,
  MapPin,
  CalendarDays,
  MessageSquare,
  Mail,
  Send,
  X,
  type LucideIcon,
  // Inventory icons
  Boxes,
  Building2,
  Truck,
  ArrowLeftRight,
  Factory,
  RotateCcw,
  Tag,
  CheckSquare,
  ClipboardCheck,
  BarChart3,
  Layers,
  // Projects icon
  Kanban,
} from "lucide-react"
import { useSession } from "@/lib/auth/client"
import { useTheme } from "next-themes"
import { TenantSwitcher } from "./tenant-switcher"
import { UnreadBadge } from "./unread-badge"

interface NavItem {
  name: string
  href: string
  icon: LucideIcon
  external?: boolean
  subsections?: { name: string; href: string; icon: LucideIcon }[]
  subtitle?: string
}

const navigation: NavItem[] = [
  { name: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  {
    name: "Apps",
    href: "/apps",
    icon: LayoutGrid,
    subtitle: "Every AXXES app in one place",
  },
  { name: "Contacts", href: "/crm", icon: Users },
  { name: "Projects", href: "/projects", icon: Kanban, subtitle: "Powered by Lanes" },
  { name: "Assets", href: "/assets", icon: FileImage, subtitle: "Powered by folders.axxes.club" },
  {
    name: "Events",
    href: "/events",
    icon: Calendar,
    subtitle: "Powered by afters.am",
    subsections: [
      { name: "Events", href: "/events", icon: CalendarDays },
      { name: "Venues", href: "/events/venues", icon: MapPin },
    ],
  },
  {
    name: "Inventory",
    href: "https://kr8s.axxes.club",
    external: true,
    icon: Package,
    subtitle: "Powered by Krates",
  },
  { name: "Orders", href: "/orders", icon: ShoppingCart },
  {
    name: "Social Media",
    href: "/social",
    icon: Share2,
    subsections: [
      { name: "Accounts", href: "/social", icon: Users },
      { name: "Posts", href: "/social/posts", icon: FileText },
    ],
  },
  {
    name: "Website",
    href: "/website",
    icon: Globe,
    subsections: [
      { name: "Pages", href: "/website/pages", icon: FileText },
      { name: "Settings", href: "/website/settings", icon: Settings },
    ],
  },
  { name: "Messages", href: "/messages", icon: MessageSquare },
  {
    name: "Newsletter",
    href: "/newsletter",
    icon: Mail,
    subsections: [
      { name: "Overview", href: "/newsletter", icon: LayoutDashboard },
      { name: "Campaigns", href: "/newsletter/campaigns", icon: Send },
      { name: "Lists", href: "/newsletter/lists", icon: Users },
      { name: "Templates", href: "/newsletter/templates", icon: FileText },
      { name: "Settings", href: "/newsletter/settings", icon: Settings },
    ],
  },
  {
    name: "Marketing",
    href: "/marketing",
    icon: Megaphone,
    subsections: [
      { name: "SEO", href: "/marketing/seo", icon: Search },
    ],
  },
  {
    name: "Settings",
    href: "/settings",
    icon: Settings,
    subsections: [
      { name: "Brand Profile", href: "/settings/brand", icon: Palette },
      { name: "Appearance", href: "/settings/appearance", icon: SunMoon },
      { name: "Team", href: "/settings/team", icon: UserCog },
      { name: "Billing", href: "/settings/billing", icon: CreditCard },
      { name: "Integrations", href: "/settings/integrations", icon: Plug },
      { name: "Notifications", href: "/settings/notifications", icon: Bell },
    ],
  },
]

const adminNavigation: NavItem[] = [
  { name: "Admin", href: "/admin", icon: Shield },
]

interface SidebarProps {
  tenantId?: string
  tenantName?: string
  tenantLogo?: string
  isSuperadmin?: boolean
  unreadMessagesCount?: number
}

export function Sidebar({ tenantId, tenantName = "My Organization", tenantLogo, isSuperadmin = false, unreadMessagesCount = 0 }: SidebarProps) {
  const { isCollapsed, toggle } = useSidebar()
  const pathname = usePathname()
  const { data: session } = useSession()
  const user = session?.user
  const { theme, setTheme } = useTheme()
  const [mounted, setMounted] = React.useState(false)

  React.useEffect(() => {
    setMounted(true)
  }, [])

  const isAdminTenant = tenantId === "40119de9-ef87-4e41-b479-7a28ec8e3d66"
  const showAdminMenu = isSuperadmin && (process.env.NODE_ENV !== "production" || isAdminTenant)
  const allNavigation = showAdminMenu ? [...navigation, ...adminNavigation] : navigation

  return (
    <aside
      className={cn(
        "hidden lg:flex flex-col border-r bg-background transition-all duration-200 relative",
        isCollapsed ? "w-16" : "w-[260px]"
      )}
    >
      {/* Logo & Tenant Switcher */}
      <div className="flex h-16 shrink-0 items-center border-b px-4">
        <TenantSwitcher
          currentTenantId={tenantId}
          currentTenantName={tenantName}
          currentTenantLogo={tenantLogo}
          isCollapsed={isCollapsed}
        />
      </div>

      {/* Navigation */}
      <nav className="flex-1 space-y-0.5 overflow-y-auto px-3 py-4">
        {allNavigation.map((item) => {
          const isActive = pathname === item.href || pathname.startsWith(item.href + "/")
          const hasSubsections = item.subsections && item.subsections.length > 0

          if (hasSubsections && !isCollapsed) {
            return (
              <NavItemWithSubsections
                key={item.name}
                item={item}
                pathname={pathname}
              />
            )
          }

          return (
            <Link
              key={item.name}
              href={item.href}
              target={item.external ? "_blank" : undefined}
              rel={item.external ? "noopener noreferrer" : undefined}
              className={cn(
                "flex items-center gap-3 px-3 py-2 text-[13px] transition-colors",
                isActive
                  ? "text-foreground bg-accent"
                  : "text-muted-foreground hover:text-foreground hover:bg-accent/50",
                isCollapsed && "justify-center px-2"
              )}
              title={isCollapsed ? item.name : undefined}
            >
              <item.icon className="h-4 w-4 shrink-0" />
              {!isCollapsed && (
                <>
                  <div className="flex-1 flex flex-col">
                    <span>{item.name}</span>
                    {item.subtitle && (
                      <span className="text-[10px] text-muted-foreground/70 leading-tight">{item.subtitle}</span>
                    )}
                  </div>
                  {item.name === "Messages" && (
                    <UnreadBadge initialCount={unreadMessagesCount} />
                  )}
                </>
              )}
            </Link>
          )
        })}
      </nav>

      {/* User Menu */}
      <div className="border-t p-4">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              className={cn(
                "w-full justify-start gap-2 px-2",
                isCollapsed && "justify-center px-0"
              )}
            >
              <Avatar className="h-8 w-8">
                <AvatarImage src={user?.image || undefined} />
                <AvatarFallback>
                  {user?.name?.[0]?.toUpperCase() || "U"}
                </AvatarFallback>
              </Avatar>
              {!isCollapsed && (
                <>
                  <div className="flex flex-col items-start text-left">
                    <span className="text-sm font-medium">
                      {user?.name || "User"}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {user?.email}
                    </span>
                  </div>
                  <ChevronDown className="ml-auto h-4 w-4 shrink-0 opacity-50" />
                </>
              )}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="w-[240px]">
            <DropdownMenuLabel>My Account</DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem asChild>
              <Link href="/settings">
                <Settings className="mr-2 h-4 w-4" />
                Settings
              </Link>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuLabel className="text-xs font-normal text-muted-foreground">
              Theme
            </DropdownMenuLabel>
            <DropdownMenuItem onClick={() => setTheme("light")}>
              <Sun className="mr-2 h-4 w-4" />
              Light
              {mounted && theme === "light" && <span className="ml-auto text-xs">✓</span>}
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => setTheme("dark")}>
              <Moon className="mr-2 h-4 w-4" />
              Dark
              {mounted && theme === "dark" && <span className="ml-auto text-xs">✓</span>}
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => setTheme("system")}>
              <Monitor className="mr-2 h-4 w-4" />
              System
              {mounted && theme === "system" && <span className="ml-auto text-xs">✓</span>}
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={() => {
                window.location.href = "/sign-out"
              }}
            >
              <LogOut className="mr-2 h-4 w-4" />
              Sign out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Collapse Toggle */}
      <Button
        variant="ghost"
        size="icon-sm"
        className="absolute -right-3 top-20 rounded-full border bg-background shadow-sm"
        onClick={toggle}
      >
        {isCollapsed ? (
          <PanelLeft className="h-4 w-4" />
        ) : (
          <PanelLeftClose className="h-4 w-4" />
        )}
      </Button>
    </aside>
  )
}

function NavItemWithSubsections({
  item,
  pathname,
}: {
  item: NavItem
  pathname: string
}) {
  const isParentActive = pathname.startsWith(item.href)
  const [isOpen, setIsOpen] = React.useState(isParentActive)

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <CollapsibleTrigger asChild>
        <button
          className={cn(
            "flex w-full items-center gap-3 px-3 py-2 text-[13px] transition-colors",
            isParentActive
              ? "text-foreground bg-accent"
              : "text-muted-foreground hover:text-foreground hover:bg-accent/50"
          )}
        >
          <item.icon className="h-4 w-4 shrink-0" />
          <div className="flex-1 flex flex-col text-left">
            <span>{item.name}</span>
            {item.subtitle && (
              <span className="text-[10px] text-muted-foreground/70 leading-tight font-normal">{item.subtitle}</span>
            )}
          </div>
          <ChevronRight
            className={cn(
              "h-3.5 w-3.5 shrink-0 transition-transform opacity-50",
              isOpen && "rotate-90"
            )}
          />
        </button>
      </CollapsibleTrigger>
      <CollapsibleContent className="pl-3 pt-0.5">
        <div className="space-y-0.5 border-l border-border/50 pl-4 ml-2">
          {item.subsections?.map((sub) => {
            const isSubActive = pathname === sub.href
            return (
              <Link
                key={sub.name}
                href={sub.href}
                className={cn(
                  "flex items-center gap-2.5 px-3 py-1.5 text-[13px] transition-colors",
                  isSubActive
                    ? "text-foreground"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                <sub.icon className="h-3.5 w-3.5 shrink-0" />
                <span>{sub.name}</span>
              </Link>
            )
          })}
        </div>
      </CollapsibleContent>
    </Collapsible>
  )
}

export function MobileSidebarTrigger() {
  const { setMobileOpen } = useSidebar()

  return (
    <Button
      variant="ghost"
      size="icon"
      className="lg:hidden"
      onClick={() => setMobileOpen(true)}
    >
      <Menu className="h-5 w-5" />
    </Button>
  )
}

interface MobileSidebarProps {
  tenantId?: string
  tenantName?: string
  tenantLogo?: string
  isSuperadmin?: boolean
  unreadMessagesCount?: number
}

export function MobileSidebar({ tenantId, tenantName = "My Organization", tenantLogo, isSuperadmin = false, unreadMessagesCount = 0 }: MobileSidebarProps) {
  const { isMobileOpen, setMobileOpen } = useSidebar()
  const pathname = usePathname()
  const { data: session } = useSession()
  const user = session?.user
  const { theme, setTheme } = useTheme()
  const [mounted, setMounted] = React.useState(false)

  React.useEffect(() => {
    setMounted(true)
  }, [])

  // Close mobile sidebar on route change
  React.useEffect(() => {
    setMobileOpen(false)
  }, [pathname, setMobileOpen])

  const isAdminTenant = tenantId === "40119de9-ef87-4e41-b479-7a28ec8e3d66"
  const showAdminMenu = isSuperadmin && (process.env.NODE_ENV !== "production" || isAdminTenant)
  const allNavigation = showAdminMenu ? [...navigation, ...adminNavigation] : navigation

  if (!isMobileOpen) return null

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-40 bg-black/50 lg:hidden"
        onClick={() => setMobileOpen(false)}
      />

      {/* Mobile Sidebar */}
      <aside className="fixed inset-y-0 left-0 z-50 w-[280px] bg-background shadow-lg lg:hidden flex flex-col">
        {/* Header */}
        <div className="flex h-16 shrink-0 items-center justify-between border-b px-4">
          <TenantSwitcher
            currentTenantId={tenantId}
            currentTenantName={tenantName}
            currentTenantLogo={tenantLogo}
            isCollapsed={false}
          />
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setMobileOpen(false)}
          >
            <X className="h-5 w-5" />
          </Button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 space-y-0.5 overflow-y-auto px-3 py-4">
          {allNavigation.map((item) => {
            const isActive = pathname === item.href || pathname.startsWith(item.href + "/")
            const hasSubsections = item.subsections && item.subsections.length > 0

            if (hasSubsections) {
              return (
                <NavItemWithSubsections
                  key={item.name}
                  item={item}
                  pathname={pathname}
                />
              )
            }

            return (
              <Link
                key={item.name}
                href={item.href}
                target={item.external ? "_blank" : undefined}
                rel={item.external ? "noopener noreferrer" : undefined}
                className={cn(
                  "flex items-center gap-3 px-3 py-2 text-[13px] transition-colors",
                  isActive
                    ? "text-foreground bg-accent"
                    : "text-muted-foreground hover:text-foreground hover:bg-accent/50"
                )}
              >
                <item.icon className="h-4 w-4 shrink-0" />
                <span className="flex-1">{item.name}</span>
                {item.name === "Messages" && (
                  <UnreadBadge initialCount={unreadMessagesCount} />
                )}
              </Link>
            )
          })}
        </nav>

        {/* User Menu */}
        <div className="border-t p-4">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="w-full justify-start gap-2 px-2">
                <Avatar className="h-8 w-8">
                  <AvatarImage src={user?.image || undefined} />
                  <AvatarFallback>
                    {user?.name?.[0]?.toUpperCase() || "U"}
                  </AvatarFallback>
                </Avatar>
                <div className="flex flex-col items-start text-left">
                  <span className="text-sm font-medium">
                    {user?.name || "User"}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    {user?.email}
                  </span>
                </div>
                <ChevronDown className="ml-auto h-4 w-4 shrink-0 opacity-50" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-[240px]">
              <DropdownMenuLabel>My Account</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem asChild>
                <Link href="/settings">
                  <Settings className="mr-2 h-4 w-4" />
                  Settings
                </Link>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuLabel className="text-xs font-normal text-muted-foreground">
                Theme
              </DropdownMenuLabel>
              <DropdownMenuItem onClick={() => setTheme("light")}>
                <Sun className="mr-2 h-4 w-4" />
                Light
                {mounted && theme === "light" && <span className="ml-auto text-xs">✓</span>}
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setTheme("dark")}>
                <Moon className="mr-2 h-4 w-4" />
                Dark
                {mounted && theme === "dark" && <span className="ml-auto text-xs">✓</span>}
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setTheme("system")}>
                <Monitor className="mr-2 h-4 w-4" />
                System
                {mounted && theme === "system" && <span className="ml-auto text-xs">✓</span>}
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={() => {
                  window.location.href = "/sign-out"
                }}
              >
                <LogOut className="mr-2 h-4 w-4" />
                Sign out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </aside>
    </>
  )
}
