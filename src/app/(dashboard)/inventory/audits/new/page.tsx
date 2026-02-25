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

export default function NewAuditPage() {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [products, setProducts] = useState<{ id: string; name: string }[]>([])
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
        // Ignore
      }
    }
    loadData()
  }, [])

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setIsLoading(true)
    setError(null)
    setError("Audit functionality coming soon")
    setIsLoading(false)
  }

  return (
    <div className="space-y-8">
      <PageHeader heading="Create Inventory Audit" description="Start a new inventory audit" actions={
        <Link href="/inventory/audits"><Button variant="outline"><ArrowLeft className="h-4 w-4" />Back</Button></Link>
      } />

      <form onSubmit={handleSubmit}>
        <SectionHeader number="01" title="Audit Details" />
        <Card className="mt-4">
          <CardContent className="p-6 space-y-6">
            {error && <div className="bg-destructive/10 p-3 text-sm text-destructive">{error}</div>}
            
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="auditType">Audit Type *</Label>
                <select id="auditType" name="auditType" required className="w-full border border-input bg-background px-3 py-2 text-sm">
                  <option value="">Select type</option>
                  <option value="full">Full Inventory</option>
                  <option value="location">By Location</option>
                  <option value="category">By Category</option>
                  <option value="spot">Spot Check</option>
                </select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="locationId">Location</Label>
                <select id="locationId" name="locationId" className="w-full border border-input bg-background px-3 py-2 text-sm">
                  <option value="">All locations</option>
                  {locations.map((loc) => (<option key={loc.id} value={loc.id}>{loc.name}</option>))}
                </select>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="title">Audit Title *</Label>
              <Input id="title" name="title" placeholder="Q1 2026 Inventory Count" required />
            </div>

            <div className="space-y-2">
              <Label htmlFor="notes">Notes</Label>
              <textarea id="notes" name="notes" rows={3} className="w-full border border-input bg-background px-3 py-2 text-sm" />
            </div>
          </CardContent>
        </Card>

        <div className="mt-8 flex justify-end gap-4">
          <Link href="/inventory/audits"><Button type="button" variant="outline">Cancel</Button></Link>
          <Button type="submit" disabled={isLoading}>{isLoading ? "Creating..." : "Start Audit"}</Button>
        </div>
      </form>
    </div>
  )
}