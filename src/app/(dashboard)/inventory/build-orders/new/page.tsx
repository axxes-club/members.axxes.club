"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { PageHeader } from "@/components/layout/page-header"
import { SectionHeader } from "@/components/layout/section-header"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { ArrowLeft } from "lucide-react"
import { getProducts } from "@/lib/actions/inventory"
import { getLocations } from "@/lib/actions/inventory-locations"

export default function NewBuildOrderPage() {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [products, setProducts] = useState<{ id: string; name: string; sku: string | null }[]>([])
  const [locations, setLocations] = useState<{ id: string; name: string }[]>([])

  useEffect(() => {
    async function loadData() {
      try {
        const [prods, locs] = await Promise.all([
          getProducts({ limit: 100 }),
          getLocations({ limit: 100 }),
        ])
        setProducts(prods.products)
        setLocations(locs.locations)
      } catch {
        // Ignore errors
      }
    }
    loadData()
  }, [])

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setIsLoading(true)
    setError(null)
    setError("Build order functionality coming soon")
    setIsLoading(false)
  }

  return (
    <div className="space-y-8">
      <PageHeader
        heading="Create Build Order"
        description="Create a manufacturing/assembly order"
        actions={
          <Link href="/inventory/build-orders">
            <Button variant="outline">
              <ArrowLeft className="h-4 w-4" />
              Back
            </Button>
          </Link>
        }
      />

      <form onSubmit={handleSubmit}>
        <SectionHeader number="01" title="Build Details" />

        <Card className="mt-4">
          <CardContent className="p-6 space-y-6">
            {error && (
              <div className="bg-destructive/10 p-3 text-sm text-destructive">
                {error}
              </div>
            )}

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="productId">Product to Build *</Label>
                <select id="productId" name="productId" required className="w-full border border-input bg-background px-3 py-2 text-sm">
                  <option value="">Select product</option>
                  {products.map((prod) => (
                    <option key={prod.id} value={prod.id}>{prod.name}</option>
                  ))}
                </select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="quantity">Quantity *</Label>
                <Input id="quantity" name="quantity" type="number" min="1" required />
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="locationId">Build Location</Label>
                <select id="locationId" name="locationId" className="w-full border border-input bg-background px-3 py-2 text-sm">
                  <option value="">Select location</option>
                  {locations.map((loc) => (
                    <option key={loc.id} value={loc.id}>{loc.name}</option>
                  ))}
                </select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="targetDate">Target Completion Date</Label>
                <Input id="targetDate" name="targetDate" type="date" />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="title">Build Title</Label>
              <Input id="title" name="title" placeholder="Production run name" />
            </div>

            <div className="space-y-2">
              <Label htmlFor="notes">Notes</Label>
              <textarea id="notes" name="notes" rows={3} className="w-full border border-input bg-background px-3 py-2 text-sm" placeholder="Build notes..." />
            </div>
          </CardContent>
        </Card>

        <div className="mt-8 flex justify-end gap-4">
          <Link href="/inventory/build-orders">
            <Button type="button" variant="outline">Cancel</Button>
          </Link>
          <Button type="submit" disabled={isLoading}>{isLoading ? "Creating..." : "Create Build Order"}</Button>
        </div>
      </form>
    </div>
  )
}