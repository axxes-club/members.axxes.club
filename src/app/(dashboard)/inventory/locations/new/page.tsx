"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { PageHeader } from "@/components/layout/page-header"
import { SectionHeader } from "@/components/layout/section-header"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { ArrowLeft } from "lucide-react"
import { createLocation } from "@/lib/actions/inventory-locations"

export default function NewLocationPage() {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setIsLoading(true)
    setError(null)

    const formData = new FormData(e.currentTarget)
    const data = {
      name: formData.get("name") as string,
      code: formData.get("code") as string,
      addressLine1: formData.get("addressLine1") as string,
      addressLine2: formData.get("addressLine2") as string,
      city: formData.get("city") as string,
      state: formData.get("state") as string,
      postalCode: formData.get("postalCode") as string,
      country: formData.get("country") as string,
      isDefault: formData.get("isDefault") === "on",
      isActive: true,
    }

    try {
      await createLocation(data)
      router.push("/inventory/locations")
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create location")
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="space-y-8">
      <PageHeader
        heading="Add Location"
        description="Create a new inventory location"
        actions={
          <Link href="/inventory/locations">
            <Button variant="outline">
              <ArrowLeft className="h-4 w-4" />
              Back
            </Button>
          </Link>
        }
      />

      <form onSubmit={handleSubmit}>
        <SectionHeader number="01" title="Basic Information" />

        <Card className="mt-4">
          <CardContent className="p-6 space-y-6">
            {error && (
              <div className="bg-destructive/10 p-3 text-sm text-destructive">
                {error}
              </div>
            )}

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="name">Location Name *</Label>
                <Input id="name" name="name" placeholder="Main Warehouse" required />
              </div>

              <div className="space-y-2">
                <Label htmlFor="code">Location Code</Label>
                <Input id="code" name="code" placeholder="WH-001" />
              </div>
            </div>

            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="isDefault"
                name="isDefault"
                className="h-4 w-4 border-input"
              />
              <Label htmlFor="isDefault">Set as default location</Label>
            </div>
          </CardContent>
        </Card>

        <SectionHeader number="02" title="Address" className="mt-8" />

        <Card className="mt-4">
          <CardContent className="p-6 space-y-6">
            <div className="space-y-2">
              <Label htmlFor="addressLine1">Address Line 1</Label>
              <Input id="addressLine1" name="addressLine1" placeholder="123 Main St" />
            </div>

            <div className="space-y-2">
              <Label htmlFor="addressLine2">Address Line 2</Label>
              <Input id="addressLine2" name="addressLine2" placeholder="Suite 100" />
            </div>

            <div className="grid gap-4 sm:grid-cols-3">
              <div className="space-y-2">
                <Label htmlFor="city">City</Label>
                <Input id="city" name="city" placeholder="New York" />
              </div>

              <div className="space-y-2">
                <Label htmlFor="state">State/Province</Label>
                <Input id="state" name="state" placeholder="NY" />
              </div>

              <div className="space-y-2">
                <Label htmlFor="postalCode">Postal Code</Label>
                <Input id="postalCode" name="postalCode" placeholder="10001" />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="country">Country</Label>
              <select
                id="country"
                name="country"
                className="w-full border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
              >
                <option value="US">United States</option>
                <option value="CA">Canada</option>
                <option value="GB">United Kingdom</option>
                <option value="AU">Australia</option>
                <option value="DE">Germany</option>
                <option value="FR">France</option>
                <option value="MX">Mexico</option>
              </select>
            </div>
          </CardContent>
        </Card>

        <div className="mt-8 flex justify-end gap-4">
          <Link href="/inventory/locations">
            <Button type="button" variant="outline">
              Cancel
            </Button>
          </Link>
          <Button type="submit" disabled={isLoading}>
            {isLoading ? "Creating..." : "Create Location"}
          </Button>
        </div>
      </form>
    </div>
  )
}