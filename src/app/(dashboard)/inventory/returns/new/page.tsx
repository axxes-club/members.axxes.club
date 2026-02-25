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

export default function NewReturnPage() {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [products, setProducts] = useState<{ id: string; name: string }[]>([])

  useEffect(() => {
    async function loadData() {
      try {
        const prods = await getProducts({ limit: 100 })
        setProducts(prods.products)
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
    setError("Return order functionality coming soon")
    setIsLoading(false)
  }

  return (
    <div className="space-y-8">
      <PageHeader heading="Create Return Order" description="Process a product return" actions={
        <Link href="/inventory/returns"><Button variant="outline"><ArrowLeft className="h-4 w-4" />Back</Button></Link>
      } />

      <form onSubmit={handleSubmit}>
        <SectionHeader number="01" title="Return Details" />
        <Card className="mt-4">
          <CardContent className="p-6 space-y-6">
            {error && <div className="bg-destructive/10 p-3 text-sm text-destructive">{error}</div>}
            
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="customerName">Customer Name *</Label>
                <Input id="customerName" name="customerName" required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="customerEmail">Customer Email</Label>
                <Input id="customerEmail" name="customerEmail" type="email" />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="productId">Product</Label>
              <select id="productId" name="productId" className="w-full border border-input bg-background px-3 py-2 text-sm">
                <option value="">Select product</option>
                {products.map((p) => (<option key={p.id} value={p.id}>{p.name}</option>))}
              </select>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="quantity">Quantity *</Label>
                <Input id="quantity" name="quantity" type="number" min="1" required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="reason">Reason *</Label>
                <select id="reason" name="reason" required className="w-full border border-input bg-background px-3 py-2 text-sm">
                  <option value="">Select reason</option>
                  <option value="defective">Defective</option>
                  <option value="wrong_item">Wrong Item</option>
                  <option value="not_as_described">Not as Described</option>
                  <option value="changed_mind">Changed Mind</option>
                  <option value="other">Other</option>
                </select>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="customerNotes">Customer Notes</Label>
              <textarea id="customerNotes" name="customerNotes" rows={3} className="w-full border border-input bg-background px-3 py-2 text-sm" />
            </div>
          </CardContent>
        </Card>

        <div className="mt-8 flex justify-end gap-4">
          <Link href="/inventory/returns"><Button type="button" variant="outline">Cancel</Button></Link>
          <Button type="submit" disabled={isLoading}>{isLoading ? "Creating..." : "Create Return"}</Button>
        </div>
      </form>
    </div>
  )
}