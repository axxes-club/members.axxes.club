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
import { getLocations } from "@/lib/actions/inventory-locations"
import { getProducts } from "@/lib/actions/inventory"

export default function NewTransferPage() {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [locations, setLocations] = useState<{ id: string; name: string }[]>([])
  const [products, setProducts] = useState<{ id: string; name: string; sku: string | null }[]>([])

  useEffect(() => {
    async function loadData() {
      try {
        const [locs, prods] = await Promise.all([
          getLocations({ limit: 100 }),
          getProducts({ limit: 100 }),
        ])
        setLocations(locs.locations)
        setProducts(prods.products)
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

    // Placeholder - would need actual transfer action
    setError("Transfer functionality coming soon")
    setIsLoading(false)
  }

  return (
    <div className="space-y-8">
      <PageHeader
        heading="Create Stock Transfer"
        description="Transfer stock between locations"
        actions={
          <Link href="/inventory/transfers">
            <Button variant="outline">
              <ArrowLeft className="h-4 w-4" />
              Back
            </Button>
          </Link>
        }
      />

      <form onSubmit={handleSubmit}>
        <SectionHeader number="01" title="Transfer Details" />

        <Card className="mt-4">
          <CardContent className="p-6 space-y-6">
            {error && (
              <div className="bg-destructive/10 p-3 text-sm text-destructive">
                {error}
              </div>
            )}

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="fromLocationId">From Location *</Label>
                <select
                  id="fromLocationId"
                  name="fromLocationId"
                  required
                  className="w-full border border-input bg-background px-3 py-2 text-sm"
                >
                  <option value="">Select source location</option>
                  {locations.map((loc) => (
                    <option key={loc.id} value={loc.id}>{loc.name}</option>
                  ))}
                </select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="toLocationId">To Location *</Label>
                <select
                  id="toLocationId"
                  name="toLocationId"
                  required
                  className="w-full border border-input bg-background px-3 py-2 text-sm"
                >
                  <option value="">Select destination location</option>
                  {locations.map((loc) => (
                    <option key={loc.id} value={loc.id}>{loc.name}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="productId">Product</Label>
              <select
                id="productId"
                name="productId"
                className="w-full border border-input bg-background px-3 py-2 text-sm"
              >
                <option value="">Select product</option>
                {products.map((prod) => (
                  <option key={prod.id} value={prod.id}>
                    {prod.name} {prod.sku ? `(${prod.sku})` : ""}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="quantity">Quantity *</Label>
              <Input id="quantity" name="quantity" type="number" min="1" required />
            </div>

            <div className="space-y-2">
              <Label htmlFor="notes">Notes</Label>
              <textarea
                id="notes"
                name="notes"
                rows={3}
                className="w-full border border-input bg-background px-3 py-2 text-sm"
                placeholder="Transfer notes..."
              />
            </div>
          </CardContent>
        </Card>

        <div className="mt-8 flex justify-end gap-4">
          <Link href="/inventory/transfers">
            <Button type="button" variant="outline">Cancel</Button>
          </Link>
          <Button type="submit" disabled={isLoading}>
            {isLoading ? "Creating..." : "Create Transfer"}
          </Button>
        </div>
      </form>
    </div>
  )
}