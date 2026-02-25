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
import { ArrowLeft, Plus, Trash2 } from "lucide-react"
import { getProducts } from "@/lib/actions/inventory"

interface PriceItem {
  id: string
  productId: string
  productName: string
  price: string
}

export default function NewPriceListPage() {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [products, setProducts] = useState<{ id: string; name: string; price: string }[]>([])
  const [priceItems, setPriceItems] = useState<PriceItem[]>([])

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

  const addPriceItem = () => {
    setPriceItems([...priceItems, { id: crypto.randomUUID(), productId: "", productName: "", price: "" }])
  }

  const removePriceItem = (id: string) => {
    setPriceItems(priceItems.filter(item => item.id !== id))
  }

  const updatePriceItem = (id: string, productId: string) => {
    const product = products.find(p => p.id === productId)
    setPriceItems(priceItems.map(item => 
      item.id === id 
        ? { ...item, productId, productName: product?.name || "", price: product?.price || "" }
        : item
    ))
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setIsLoading(true)
    setError(null)
    setError("Price list functionality coming soon")
    setIsLoading(false)
  }

  return (
    <div className="space-y-8">
      <PageHeader heading="Create Price List" description="Create a new price list" actions={
        <Link href="/inventory/price-lists"><Button variant="outline"><ArrowLeft className="h-4 w-4" />Back</Button></Link>
      } />

      <form onSubmit={handleSubmit}>
        <SectionHeader number="01" title="Price List Details" />
        <Card className="mt-4">
          <CardContent className="p-6 space-y-6">
            {error && <div className="bg-destructive/10 p-3 text-sm text-destructive">{error}</div>}
            
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="name">Price List Name *</Label>
                <Input id="name" name="name" placeholder="Wholesale Pricing" required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="currency">Currency</Label>
                <select id="currency" name="currency" className="w-full border border-input bg-background px-3 py-2 text-sm">
                  <option value="USD">USD</option>
                  <option value="EUR">EUR</option>
                  <option value="GBP">GBP</option>
                </select>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <textarea id="description" name="description" rows={2} className="w-full border border-input bg-background px-3 py-2 text-sm" />
            </div>
          </CardContent>
        </Card>

        <SectionHeader number="02" title="Prices" className="mt-8" />
        <Card className="mt-4">
          <CardContent className="p-6 space-y-4">
            {priceItems.map((item) => (
              <div key={item.id} className="grid gap-4 sm:grid-cols-4 items-end">
                <div className="sm:col-span-2 space-y-2">
                  <Label className="text-xs text-muted-foreground">Product</Label>
                  <select value={item.productId} onChange={(e) => updatePriceItem(item.id, e.target.value)} className="w-full border border-input bg-background px-3 py-2 text-sm">
                    <option value="">Select product</option>
                    {products.filter(p => !priceItems.some(pi => pi.productId === p.id && pi.id !== item.id)).map((p) => (
                      <option key={p.id} value={p.id}>{p.name}</option>
                    ))}
                  </select>
                </div>
                <div className="space-y-2">
                  <Label className="text-xs text-muted-foreground">Price</Label>
                  <Input type="number" step="0.01" value={item.price} onChange={(e) => setPriceItems(priceItems.map(pi => pi.id === item.id ? {...pi, price: e.target.value} : pi))} />
                </div>
                <Button type="button" variant="ghost" size="icon" onClick={() => removePriceItem(item.id)}>
                  <Trash2 className="h-4 w-4 text-muted-foreground" />
                </Button>
              </div>
            ))}
            <Button type="button" variant="outline" onClick={addPriceItem}>
              <Plus className="h-4 w-4" />Add Price
            </Button>
          </CardContent>
        </Card>

        <div className="mt-8 flex justify-end gap-4">
          <Link href="/inventory/price-lists"><Button type="button" variant="outline">Cancel</Button></Link>
          <Button type="submit" disabled={isLoading}>{isLoading ? "Creating..." : "Create Price List"}</Button>
        </div>
      </form>
    </div>
  )
}