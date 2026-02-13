"use client"

import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { LogIn, LogOut, RefreshCw, Monitor, Smartphone, Globe } from "lucide-react"

interface ActivityItem {
  id: string
  eventType: string
  ipAddress: string | null
  userAgent: string | null
  createdAt: Date
  user: {
    id: string
    name: string
    email: string
    image: string | null
  } | null
  tenant: {
    id: string
    name: string
  } | null
}

interface ActivityTableProps {
  activities: ActivityItem[]
}

const eventConfig = {
  login: { label: "Login", icon: LogIn, variant: "success" as const },
  logout: { label: "Logout", icon: LogOut, variant: "secondary" as const },
  session_refresh: { label: "Session", icon: RefreshCw, variant: "outline" as const },
}

function parseUserAgent(ua: string | null): { device: string; browser: string } {
  if (!ua) return { device: "Unknown", browser: "Unknown" }

  let device = "Desktop"
  let browser = "Unknown"

  // Detect device
  if (ua.includes("Mobile") || ua.includes("Android")) {
    device = "Mobile"
  } else if (ua.includes("Tablet") || ua.includes("iPad")) {
    device = "Tablet"
  }

  // Detect browser
  if (ua.includes("Chrome") && !ua.includes("Edg")) {
    browser = "Chrome"
  } else if (ua.includes("Safari") && !ua.includes("Chrome")) {
    browser = "Safari"
  } else if (ua.includes("Firefox")) {
    browser = "Firefox"
  } else if (ua.includes("Edg")) {
    browser = "Edge"
  }

  return { device, browser }
}

function formatRelativeTime(date: Date): string {
  const now = new Date()
  const diffMs = now.getTime() - new Date(date).getTime()
  const diffMins = Math.floor(diffMs / 60000)
  const diffHours = Math.floor(diffMs / 3600000)
  const diffDays = Math.floor(diffMs / 86400000)

  if (diffMins < 1) return "Just now"
  if (diffMins < 60) return `${diffMins}m ago`
  if (diffHours < 24) return `${diffHours}h ago`
  if (diffDays < 7) return `${diffDays}d ago`
  return new Date(date).toLocaleDateString()
}

export function ActivityTable({ activities }: ActivityTableProps) {
  if (activities.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        No login activity recorded yet.
      </div>
    )
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full">
        <thead>
          <tr className="border-b text-left text-sm text-muted-foreground">
            <th className="pb-3 font-medium">User</th>
            <th className="pb-3 font-medium">Event</th>
            <th className="pb-3 font-medium">Device</th>
            <th className="pb-3 font-medium">IP Address</th>
            <th className="pb-3 font-medium">Business</th>
            <th className="pb-3 font-medium text-right">Time</th>
          </tr>
        </thead>
        <tbody>
          {activities.map((activity) => {
            const event = eventConfig[activity.eventType as keyof typeof eventConfig] || eventConfig.login
            const EventIcon = event.icon
            const { device, browser } = parseUserAgent(activity.userAgent)
            const DeviceIcon = device === "Mobile" ? Smartphone : device === "Tablet" ? Globe : Monitor

            return (
              <tr key={activity.id} className="border-b">
                <td className="py-3">
                  {activity.user ? (
                    <div className="flex items-center gap-2">
                      <Avatar className="h-6 w-6">
                        <AvatarImage src={activity.user.image || undefined} />
                        <AvatarFallback className="text-xs">
                          {activity.user.name?.[0]?.toUpperCase() || "U"}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <span className="text-sm">{activity.user.name}</span>
                        <span className="block text-xs text-muted-foreground">
                          {activity.user.email}
                        </span>
                      </div>
                    </div>
                  ) : (
                    <span className="text-sm text-muted-foreground">Unknown</span>
                  )}
                </td>
                <td className="py-3">
                  <Badge variant={event.variant} className="gap-1">
                    <EventIcon className="h-3 w-3" />
                    {event.label}
                  </Badge>
                </td>
                <td className="py-3">
                  <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                    <DeviceIcon className="h-3.5 w-3.5" />
                    <span>{browser}</span>
                  </div>
                </td>
                <td className="py-3 text-sm text-muted-foreground font-mono">
                  {activity.ipAddress || "—"}
                </td>
                <td className="py-3 text-sm text-muted-foreground">
                  {activity.tenant?.name || "—"}
                </td>
                <td className="py-3 text-right">
                  <span
                    className="text-sm text-muted-foreground"
                    title={new Date(activity.createdAt).toLocaleString()}
                  >
                    {formatRelativeTime(activity.createdAt)}
                  </span>
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}
