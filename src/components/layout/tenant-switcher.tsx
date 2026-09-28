"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import Image from "next/image"
import { toast } from "sonner"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Building2, ChevronDown, Plus, Check, Loader2 } from "lucide-react"

interface Tenant {
  id: string
  name: string
  slug: string
  role: string
}

interface TenantSwitcherProps {
  currentTenantId?: string
  currentTenantName?: string
  currentTenantLogo?: string
  isCollapsed?: boolean
}

export function TenantSwitcher({
  currentTenantId,
  currentTenantName = "My Organization",
  currentTenantLogo,
  isCollapsed = false,
}: TenantSwitcherProps) {
  const router = useRouter()
  const [tenants, setTenants] = React.useState<Tenant[]>([])
  const [isLoading, setIsLoading] = React.useState(true)
  const [isSwitching, setIsSwitching] = React.useState<string | null>(null)

  // Fetch user's tenants on mount and check for pending switch notification
  React.useEffect(() => {
    // Check for pending organization switch notification
    const switchedTo = sessionStorage.getItem("switched_organization")
    if (switchedTo) {
      sessionStorage.removeItem("switched_organization")
      toast.warning(`Switched to ${switchedTo}`, {
        description: "You are now viewing a different organization",
      })
    }

    async function fetchTenants() {
      try {
        const response = await fetch("/api/v1/tenants")
        if (response.ok) {
          const data = await response.json()
          setTenants(data.data || [])
        }
      } catch (error) {
        console.error("Failed to fetch tenants:", error)
      } finally {
        setIsLoading(false)
      }
    }
    fetchTenants()
  }, [])

  const handleSwitchTenant = async (tenantId: string) => {
    if (tenantId === currentTenantId) return

    const targetTenant = tenants.find((t) => t.id === tenantId)
    setIsSwitching(tenantId)
    try {
      const response = await fetch("/api/v1/tenants/select", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tenantId }),
      })

      if (response.ok) {
        // Store the switch notification for after redirect
        if (targetTenant) {
          sessionStorage.setItem("switched_organization", targetTenant.name)
        }
        // Refresh the page to load new tenant context
        router.refresh()
        window.location.href = "/dashboard"
      }
    } catch (error) {
      console.error("Failed to switch tenant:", error)
    } finally {
      setIsSwitching(null)
    }
  }

  const handleCreateOrganization = () => {
    router.push("/onboarding?new=true")
  }

  const getRoleBadgeVariant = (role: string) => {
    switch (role) {
      case "owner":
        return "default"
      case "admin":
        return "secondary"
      default:
        return "outline"
    }
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          className={cn(
            "w-full justify-start gap-2 px-2",
            isCollapsed && "justify-center px-0"
          )}
        >
          <div className="flex h-8 w-8 items-center justify-center  bg-primary text-primary-foreground">
            {currentTenantLogo ? (
              <Image
              src={currentTenantLogo}
              alt=""
              height={24}
              width={24}
              className="h-6 w-6"
            />
            ) : (
              <Building2 className="h-4 w-4" />
            )}
          </div>
          {!isCollapsed && (
            <>
              <span className="truncate font-semibold">{currentTenantName}</span>
              <ChevronDown className="ml-auto h-4 w-4 shrink-0 opacity-50" />
            </>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-[280px]">
        <DropdownMenuLabel>Your Organizationes</DropdownMenuLabel>
        <DropdownMenuSeparator />

        {isLoading ? (
          <div className="flex items-center justify-center py-4">
            <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
          </div>
        ) : tenants.length === 0 ? (
          <div className="px-2 py-4 text-center text-sm text-muted-foreground">
            No organizationes found
          </div>
        ) : (
          tenants.map((tenant) => (
            <DropdownMenuItem
              key={tenant.id}
              onClick={() => handleSwitchTenant(tenant.id)}
              disabled={isSwitching !== null}
              className="flex items-center justify-between"
            >
              <div className="flex items-center gap-2">
                <Building2 className="h-4 w-4 text-muted-foreground" />
                <span className="truncate">{tenant.name}</span>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant={getRoleBadgeVariant(tenant.role)} className="text-[10px]">
                  {tenant.role}
                </Badge>
                {tenant.id === currentTenantId && (
                  <Check className="h-4 w-4 text-primary" />
                )}
                {isSwitching === tenant.id && (
                  <Loader2 className="h-4 w-4 animate-spin" />
                )}
              </div>
            </DropdownMenuItem>
          ))
        )}

        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={handleCreateOrganization}>
          <Plus className="mr-2 h-4 w-4" />
          Create New Organization
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
