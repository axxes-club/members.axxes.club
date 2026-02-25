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

export default function NewQualityCheckPage() {
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
    setError("Quality check functionality coming soon")
    setIsLoading(false)
  }

  return (
    <div className="space-y-8">
      <PageHeader heading="Create Quality Check" description="Record a quality inspection" actions={
        <Link href="/inventory/quality"><Button variant="outline"><ArrowLeft className="h-4 w-4" />Back</Button></Link>
      } />

      <form onSubmit={handleSubmit}>
        <SectionHeader number="01" title="Quality Check Details" />
        <Card className="mt-4">
          <CardContent className="p-6 space-y-6">
            {error && <div className="bg-destructive/10 p-3 text-sm text-destructive">{error}</div>}
            
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="productId">Product *</Label>
                <select id="productId" name="productId" required className="w-full border border-input bg-background px-3 py-2 text-sm">
                  <option value="">Select product</option>
                  {products.map((p) => (<option key={p.id} value={p.id}>{p.name}</option>))}
                </select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="checkType">Check Type *</Label>
                <select id="checkType" name="checkType" required className="w-full border border-input bg-background px-3 py-2 text-sm">
                  <option value="">Select type</option>
                  <option value="incoming">Incoming Inspection</option>
                  <option value="in_process">In-Process Check</option>
                  <option value="final">Final Inspection</option>
                  <option value="outgoing">Outgoing Check</option>
                </select>
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="quantityChecked">Quantity Checked *</Label>
                <Input id="quantityChecked" name="quantityChecked" type="number" min="1" required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="result">Result *</Label>
                <select id="result" name="result" required className="w-full border border-input bg-background px-3 py-2 text-sm">
                  <option value="">Select result</option>
                  <option value="pass">Pass</option>
                  <option value="fail">Fail</option>
                  <option value="partial">Partial Pass</option>
                </select>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="defects">Defects Found</Label>
              <Input id="defects" name="defects" type="number" min="0" />
            </div>

            <div className="space-y-2">
              <Label htmlFor="notes">Notes</Label>
              <textarea id="notes" name="notes" rows={3} className="w-full border border-input bg-background px-3 py-2 text-sm" />
            </div>
          </CardContent>
        </Card>

        <div className="mt-8 flex justify-end gap-4">
          <Link href="/inventory/quality"><Button type="button" variant="outline">Cancel</Button></Link>
          <Button type="submit" disabled={isLoading}>{isLoading ? "Creating..." : "Create Check"}</Button>
        </div>
      </form>
    </div>
  )
}