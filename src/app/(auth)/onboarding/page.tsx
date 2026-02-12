"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Building2, ArrowRight } from "lucide-react"

export default function OnboardingPage() {
  const [isLoading, setIsLoading] = useState(false)
  const [businessName, setBusinessName] = useState("")
  const [error, setError] = useState<string | null>(null)

  async function handleContinue() {
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
    } catch (err) {
      setError("An unexpected error occurred")
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="space-y-6">
      <div className="space-y-2 text-center">
        <h1 className="text-display-sm">Set up your business</h1>
        <p className="text-body-md text-muted-foreground">
          Let&apos;s get your business set up on members.axxes.club
        </p>
      </div>

      <Card>
        <CardHeader>
          <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary text-primary-foreground mb-4">
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
              <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
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
              onClick={handleContinue}
            >
              {isLoading ? "Creating..." : "Continue"}
              <ArrowRight className="h-4 w-4" />
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
