"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Building2, ArrowRight, Check } from "lucide-react"

interface Tenant {
  id: string
  name: string
  slug: string
  role: string
}

export default function OnboardingPage() {
  const [isLoading, setIsLoading] = useState(false)
  const [isLoadingTenants, setIsLoadingTenants] = useState(true)
  const [existingTenants, setExistingTenants] = useState<Tenant[]>([])
  const [businessName, setBusinessName] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [showCreateNew, setShowCreateNew] = useState(false)

  useEffect(() => {
    async function fetchTenants() {
      try {
        const response = await fetch("/api/v1/tenants")
        if (response.ok) {
          const data = await response.json()
          setExistingTenants(data.data || [])
        }
      } catch (err) {
        console.error("Failed to fetch tenants:", err)
      } finally {
        setIsLoadingTenants(false)
      }
    }
    fetchTenants()
  }, [])

  async function handleSelectTenant(tenantId: string) {
    setIsLoading(true)
    setError(null)

    try {
      const response = await fetch("/api/v1/tenants/select", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tenantId }),
      })

      if (response.ok) {
        window.location.href = "/dashboard"
      } else {
        const data = await response.json()
        setError(data.error || "Failed to select business")
      }
    } catch (_err) {
      setError("An unexpected error occurred")
    } finally {
      setIsLoading(false)
    }
  }

  async function handleCreateNew() {
    if (!businessName.trim()) {
      setError("Business name is required")
      return
    }

    setIsLoading(true)
    setError(null)

    try {
      const response = await fetch("/api/v1/tenants", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: businessName }),
      })

      if (response.ok) {
        window.location.href = "/dashboard"
      } else {
        const data = await response.json()
        setError(data.error || "Failed to create business")
      }
    } catch (_err) {
      setError("An unexpected error occurred")
    } finally {
      setIsLoading(false)
    }
  }

  if (isLoadingTenants) {
    return (
      <div className="space-y-6">
        <div className="space-y-2 text-center">
          <h1 className="text-display-sm">Loading...</h1>
        </div>
      </div>
    )
  }

  // If user has existing tenants, show selection
  if (existingTenants.length > 0 && !showCreateNew) {
    return (
      <div className="space-y-6">
        <div className="space-y-2 text-center">
          <h1 className="text-display-sm">Welcome back</h1>
          <p className="text-body-md text-muted-foreground">
            Select a business to continue
          </p>
        </div>

        {error && (
          <div className=" bg-destructive/10 p-3 text-sm text-destructive">
            {error}
          </div>
        )}

        <div className="space-y-3">
          {existingTenants.map((tenant) => (
            <Card
              key={tenant.id}
              className="cursor-pointer hover:border-primary transition-colors"
              onClick={() => !isLoading && handleSelectTenant(tenant.id)}
            >
              <CardContent className="flex items-center justify-between p-4">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center  bg-primary text-primary-foreground">
                    <Building2 className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="font-medium">{tenant.name}</p>
                    <p className="text-sm text-muted-foreground capitalize">{tenant.role}</p>
                  </div>
                </div>
                <ArrowRight className="h-5 w-5 text-muted-foreground" />
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="relative">
          <div className="absolute inset-0 flex items-center">
            <span className="w-full border-t" />
          </div>
          <div className="relative flex justify-center text-xs uppercase">
            <span className="bg-background px-2 text-muted-foreground">Or</span>
          </div>
        </div>

        <Button
          variant="outline"
          className="w-full"
          onClick={() => setShowCreateNew(true)}
        >
          Create a new business
        </Button>
      </div>
    )
  }

  // Show create new business form
  return (
    <div className="space-y-6">
      <div className="space-y-2 text-center">
        <h1 className="text-display-sm">Set up your business</h1>
        <p className="text-body-md text-muted-foreground">
          Let&apos;s get your business set up on members.axxes.<span className="text-purple-500">club</span>
        </p>
      </div>

      <Card>
        <CardHeader>
          <div className="flex h-12 w-12 items-center justify-center  bg-primary text-primary-foreground mb-4">
            <Building2 className="h-6 w-6" />
          </div>
          <CardTitle>Business Information</CardTitle>
          <CardDescription>
            This is how your business will appear to customers
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {error && (
              <div className=" bg-destructive/10 p-3 text-sm text-destructive">
                {error}
              </div>
            )}
            <div className="space-y-2">
              <Label htmlFor="businessName">Business Name</Label>
              <Input
                id="businessName"
                placeholder="Enter your business name"
                value={businessName}
                onChange={(e) => setBusinessName(e.target.value)}
              />
            </div>
            <Button
              type="button"
              className="w-full"
              disabled={isLoading}
              onClick={handleCreateNew}
            >
              {isLoading ? "Creating..." : "Continue"}
              <ArrowRight className="h-4 w-4" />
            </Button>
            {existingTenants.length > 0 && (
              <Button
                type="button"
                variant="ghost"
                className="w-full"
                onClick={() => setShowCreateNew(false)}
              >
                Back to my businesses
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
