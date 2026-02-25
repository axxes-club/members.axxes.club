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
import { createSupplier } from "@/lib/actions/inventory-suppliers"

export default function NewSupplierPage() {
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
      email: formData.get("email") as string,
      phone: formData.get("phone") as string,
      website: formData.get("website") as string,
      addressLine1: formData.get("addressLine1") as string,
      addressLine2: formData.get("addressLine2") as string,
      city: formData.get("city") as string,
      state: formData.get("state") as string,
      postalCode: formData.get("postalCode") as string,
      country: formData.get("country") as string,
      currency: formData.get("currency") as string,
      paymentTerms: formData.get("paymentTerms") as string,
      leadTimeDays: formData.get("leadTimeDays") ? parseInt(formData.get("leadTimeDays") as string) : undefined,
      notes: formData.get("notes") as string,
    }

    try {
      const supplier = await createSupplier(data)
      router.push(`/inventory/suppliers/${supplier.id}`)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create supplier")
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="space-y-8">
      <PageHeader
        heading="Add Supplier"
        description="Create a new supplier"
        actions={
          <Link href="/inventory/suppliers">
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
                <Label htmlFor="name">Supplier Name *</Label>
                <Input id="name" name="name" placeholder="Acme Corp" required />
              </div>

              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input id="email" name="email" type="email" placeholder="contact@acme.com" />
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="phone">Phone</Label>
                <Input id="phone" name="phone" placeholder="+1 (555) 123-4567" />
              </div>

              <div className="space-y-2">
                <Label htmlFor="website">Website</Label>
                <Input id="website" name="website" placeholder="https://acme.com" />
              </div>
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

        <SectionHeader number="03" title="Business Details" className="mt-8" />

        <Card className="mt-4">
          <CardContent className="p-6 space-y-6">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="currency">Currency</Label>
                <select
                  id="currency"
                  name="currency"
                  className="w-full border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                >
                  <option value="USD">USD - US Dollar</option>
                  <option value="EUR">EUR - Euro</option>
                  <option value="GBP">GBP - British Pound</option>
                  <option value="CAD">CAD - Canadian Dollar</option>
                </select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="paymentTerms">Payment Terms</Label>
                <select
                  id="paymentTerms"
                  name="paymentTerms"
                  className="w-full border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                >
                  <option value="">Select payment terms</option>
                  <option value="Net 15">Net 15</option>
                  <option value="Net 30">Net 30</option>
                  <option value="Net 45">Net 45</option>
                  <option value="Net 60">Net 60</option>
                  <option value="Due on Receipt">Due on Receipt</option>
                </select>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="leadTimeDays">Default Lead Time (Days)</Label>
              <Input
                id="leadTimeDays"
                name="leadTimeDays"
                type="number"
                min="0"
                placeholder="7"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="notes">Notes</Label>
              <textarea
                id="notes"
                name="notes"
                rows={4}
                className="w-full border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                placeholder="Additional notes about this supplier..."
              />
            </div>
          </CardContent>
        </Card>

        <div className="mt-8 flex justify-end gap-4">
          <Link href="/inventory/suppliers">
            <Button type="button" variant="outline">
              Cancel
            </Button>
          </Link>
          <Button type="submit" disabled={isLoading}>
            {isLoading ? "Creating..." : "Create Supplier"}
          </Button>
        </div>
      </form>
    </div>
  )
}