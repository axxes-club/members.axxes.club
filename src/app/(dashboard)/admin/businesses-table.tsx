"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { updateTenantStatus, updateTenantFoldersAccess } from "@/lib/actions/admin"
import { Switch } from "@/components/ui/switch"
import { MoreHorizontal, CheckCircle, XCircle, Clock, Ban, Users } from "lucide-react"

interface TenantWithDetails {
  id: string
  name: string
  slug: string
  type: string
  status: "active" | "suspended" | "pending" | "cancelled"
  createdAt: Date
  owner: {
    id: string
    name: string
    email: string
    image: string | null
  } | null
  memberCount: number
  foldersAccess?: boolean
}

interface BusinessesTableProps {
  businesses: TenantWithDetails[]
}

const statusConfig = {
  active: { label: "Active", variant: "success" as const, icon: CheckCircle },
  suspended: { label: "Suspended", variant: "destructive" as const, icon: Ban },
  pending: { label: "Pending", variant: "warning" as const, icon: Clock },
  cancelled: { label: "Cancelled", variant: "secondary" as const, icon: XCircle },
}

export function BusinessesTable({ businesses }: BusinessesTableProps) {
  const [loading, setLoading] = useState<string | null>(null)
  const [foldersLoading, setFoldersLoading] = useState<string | null>(null)

  async function handleStatusChange(id: string, status: "active" | "suspended" | "pending" | "cancelled") {
    setLoading(id)
    try {
      await updateTenantStatus(id, status)
    } catch (error) {
      console.error("Failed to update status:", error)
      alert(error instanceof Error ? error.message : "Failed to update status")
    } finally {
      setLoading(null)
    }
  }

  async function handleFoldersAccessChange(id: string, enabled: boolean) {
    setFoldersLoading(id)
    try {
      await updateTenantFoldersAccess(id, enabled)
    } catch (error) {
      console.error("Failed to update folders access:", error)
      alert(error instanceof Error ? error.message : "Failed to update folders access")
    } finally {
      setFoldersLoading(null)
    }
  }

  if (businesses.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        No businesses registered yet.
      </div>
    )
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full">
        <thead>
          <tr className="border-b text-left text-sm text-muted-foreground">
            <th className="pb-3 font-medium">Business</th>
            <th className="pb-3 font-medium">Owner</th>
            <th className="pb-3 font-medium">Status</th>
            <th className="pb-3 font-medium">Members</th>
            <th className="pb-3 font-medium">Folders App</th>
            <th className="pb-3 font-medium">Created</th>
            <th className="pb-3 font-medium text-right">Actions</th>
          </tr>
        </thead>
        <tbody>
          {businesses.map((business) => {
            const status = statusConfig[business.status] || statusConfig.pending
            const StatusIcon = status.icon

            return (
              <tr key={business.id} className="border-b">
                <td className="py-3">
                  <div>
                    <span className="font-medium">{business.name}</span>
                    <span className="block text-xs text-muted-foreground">
                      {business.slug}
                    </span>
                  </div>
                </td>
                <td className="py-3">
                  {business.owner ? (
                    <div className="flex items-center gap-2">
                      <Avatar className="h-6 w-6">
                        <AvatarImage src={business.owner.image || undefined} />
                        <AvatarFallback className="text-xs">
                          {business.owner.name?.[0]?.toUpperCase() || "U"}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <span className="text-sm">{business.owner.name}</span>
                        <span className="block text-xs text-muted-foreground">
                          {business.owner.email}
                        </span>
                      </div>
                    </div>
                  ) : (
                    <span className="text-sm text-muted-foreground">Unknown</span>
                  )}
                </td>
                <td className="py-3">
                  <Badge variant={status.variant} className="gap-1">
                    <StatusIcon className="h-3 w-3" />
                    {status.label}
                  </Badge>
                </td>
                <td className="py-3">
                  <div className="flex items-center gap-1 text-sm text-muted-foreground">
                    <Users className="h-3.5 w-3.5" />
                    {business.memberCount}
                  </div>
                </td>
                <td className="py-3">
                  <div className="flex items-center gap-2">
                    <Switch
                      checked={business.foldersAccess || false}
                      disabled={foldersLoading === business.id}
                      onCheckedChange={(checked) => handleFoldersAccessChange(business.id, checked)}
                    />
                    <span className="text-xs text-muted-foreground">{business.foldersAccess ? "Enabled" : "Disabled"}</span>
                  </div>
                </td>
                <td className="py-3 text-sm text-muted-foreground">
                  {new Date(business.createdAt).toLocaleDateString()}
                </td>
                <td className="py-3 text-right">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        disabled={loading === business.id}
                      >
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      {business.status !== "active" && (
                        <DropdownMenuItem onClick={() => handleStatusChange(business.id, "active")}>
                          <CheckCircle className="mr-2 h-4 w-4" />
                          Activate
                        </DropdownMenuItem>
                      )}
                      {business.status !== "suspended" && (
                        <DropdownMenuItem onClick={() => handleStatusChange(business.id, "suspended")}>
                          <Ban className="mr-2 h-4 w-4" />
                          Suspend
                        </DropdownMenuItem>
                      )}
                      {business.status !== "cancelled" && (
                        <DropdownMenuItem
                          onClick={() => handleStatusChange(business.id, "cancelled")}
                          className="text-destructive"
                        >
                          <XCircle className="mr-2 h-4 w-4" />
                          Cancel
                        </DropdownMenuItem>
                      )}
                    </DropdownMenuContent>
                  </DropdownMenu>
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}
