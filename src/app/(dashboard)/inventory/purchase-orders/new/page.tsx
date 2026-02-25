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
import { createPurchaseOrder, getSuppliersForSelect, getProductsForSelect } from "@/lib/actions/inventory-purchase-orders"
import type { Supplier } from "@/lib/db/schema/inventree"

type SupplierSelect = Pick<Supplier, "id" | "name">
type ProductSelect = { id: string; name: string; sku: string | null }

interface LineItem {
  id: string
  productId: string
  description: string
  sku: string
  quantity: number
  unitPrice: string
}

export default function NewPurchaseOrderPage() {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [suppliers, setSuppliers] = useState<SupplierSelect[]>([])
  const [products, setProducts] = useState<ProductSelect[]>([])
  const [lineItems, setLineItems] = useState<LineItem[]>([
    { id: crypto.randomUUID(), productId: "", description: "", sku: "", quantity: 1, unitPrice: "" }
  ])

  useEffect(() => {
    async function loadData() {
      try {
        const [suppliersData, productsData] = await Promise.all([
          getSuppliersForSelect(),
          getProductsForSelect(),
        ])
        setSuppliers(suppliersData)
        setProducts(productsData)
      } catch {
        // Ignore errors
      }
    }
    loadData()
  }, [])

  const addLineItem = () => {
    setLineItems([
      ...lineItems,
      { id: crypto.randomUUID(), productId: "", description: "", sku: "", quantity: 1, unitPrice: "" }
    ])
  }

  const removeLineItem = (id: string) => {
    if (lineItems.length > 1) {
      setLineItems(lineItems.filter(item => item.id !== id))
    }
  }

  const updateLineItem = (id: string, field: keyof LineItem, value: string | number) => {
    setLineItems(lineItems.map(item => {
      if (item.id === id) {
        const updated = { ...item, [field]: value }
        // Auto-fill description and SKU when product is selected
        if (field === "productId" && value) {
          const product = products.find(p => p.id === value)
          if (product) {
            updated.description = product.name
            updated.sku = product.sku || ""
          }
        }
        return updated
      }
      return item
    }))
  }

  const calculateTotal = () => {
    return lineItems.reduce((sum, item) => {
      const price = parseFloat(item.unitPrice) || 0
      return sum + (price * item.quantity)
    }, 0).toFixed(2)
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setIsLoading(true)
    setError(null)

    const formData = new FormData(e.currentTarget)
    const data = {
      supplierId: formData.get("supplierId") as string,
      currency: formData.get("currency") as string,
      orderDate: formData.get("orderDate") as string,
      targetDate: formData.get("targetDate") as string,
      notes: formData.get("notes") as string,
    }

    const items = lineItems
      .filter(item => item.description)
      .map(item => ({
        productId: item.productId || undefined,
        description: item.description,
        sku: item.sku || undefined,
        quantity: item.quantity,
        unitPrice: item.unitPrice || undefined,
      }))

    try {
      const order = await createPurchaseOrder(data, items)
      router.push(`/inventory/purchase-orders/${order.id}`)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create purchase order")
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="space-y-8">
      <PageHeader
        heading="Create Purchase Order"
        description="Create a new purchase order from a supplier"
        actions={
          <Link href="/inventory/purchase-orders">
            <Button variant="outline">
              <ArrowLeft className="h-4 w-4" />
              Back
            </Button>
          </Link>
        }
      />

      <form onSubmit={handleSubmit}>
        <SectionHeader number="01" title="Supplier Information" />

        <Card className="mt-4">
          <CardContent className="p-6 space-y-6">
            {error && (
              <div className="bg-destructive/10 p-3 text-sm text-destructive">
                {error}
              </div>
            )}

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="supplierId">Supplier *</Label>
                <select
                  id="supplierId"
                  name="supplierId"
                  required
                  className="w-full border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                >
                  <option value="">Select a supplier</option>
                  {suppliers.map((supplier) => (
                    <option key={supplier.id} value={supplier.id}>
                      {supplier.name}
                    </option>
                  ))}
                </select>
                {suppliers.length === 0 && (
                  <p className="text-sm text-muted-foreground">
                    No suppliers found. <Link href="/inventory/suppliers/new" className="text-primary underline">Add a supplier</Link>
                  </p>
                )}
              </div>

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
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="orderDate">Order Date</Label>
                <Input
                  id="orderDate"
                  name="orderDate"
                  type="date"
                  defaultValue={new Date().toISOString().split("T")[0]}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="targetDate">Target Delivery Date</Label>
                <Input
                  id="targetDate"
                  name="targetDate"
                  type="date"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="notes">Notes</Label>
              <textarea
                id="notes"
                name="notes"
                rows={3}
                className="w-full border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                placeholder="Order notes..."
              />
            </div>
          </CardContent>
        </Card>

        <SectionHeader number="02" title="Line Items" className="mt-8" />

        <Card className="mt-4">
          <CardContent className="p-6">
            <div className="space-y-4">
              {lineItems.map((item, index) => (
                <div key={item.id} className="grid gap-4 sm:grid-cols-12 items-start">
                  <div className="sm:col-span-3">
                    <Label className="text-xs text-muted-foreground">Product</Label>
                    <select
                      value={item.productId}
                      onChange={(e) => updateLineItem(item.id, "productId", e.target.value)}
                      className="w-full border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                    >
                      <option value="">Select product</option>
                      {products.map((product) => (
                        <option key={product.id} value={product.id}>
                          {product.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="sm:col-span-3">
                    <Label className="text-xs text-muted-foreground">Description *</Label>
                    <Input
                      value={item.description}
                      onChange={(e) => updateLineItem(item.id, "description", e.target.value)}
                      placeholder="Item description"
                      required
                    />
                  </div>

                  <div className="sm:col-span-2">
                    <Label className="text-xs text-muted-foreground">SKU</Label>
                    <Input
                      value={item.sku}
                      onChange={(e) => updateLineItem(item.id, "sku", e.target.value)}
                      placeholder="SKU"
                    />
                  </div>

                  <div className="sm:col-span-2">
                    <Label className="text-xs text-muted-foreground">Qty</Label>
                    <Input
                      type="number"
                      min="1"
                      value={item.quantity}
                      onChange={(e) => updateLineItem(item.id, "quantity", parseInt(e.target.value) || 1)}
                      required
                    />
                  </div>

                  <div className="sm:col-span-1">
                    <Label className="text-xs text-muted-foreground">Unit Price</Label>
                    <Input
                      type="number"
                      step="0.01"
                      min="0"
                      value={item.unitPrice}
                      onChange={(e) => updateLineItem(item.id, "unitPrice", e.target.value)}
                      placeholder="0.00"
                    />
                  </div>

                  <div className="sm:col-span-1 flex items-end">
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => removeLineItem(item.id)}
                      disabled={lineItems.length === 1}
                    >
                      <Trash2 className="h-4 w-4 text-muted-foreground" />
                    </Button>
                  </div>
                </div>
              ))}

              <Button type="button" variant="outline" onClick={addLineItem}>
                <Plus className="h-4 w-4" />
                Add Line Item
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card className="mt-4">
          <CardContent className="p-6">
            <div className="flex justify-between items-center">
              <span className="text-lg font-semibold">Total</span>
              <span className="text-2xl font-bold">${calculateTotal()}</span>
            </div>
          </CardContent>
        </Card>

        <div className="mt-8 flex justify-end gap-4">
          <Link href="/inventory/purchase-orders">
            <Button type="button" variant="outline">
              Cancel
            </Button>
          </Link>
          <Button type="submit" disabled={isLoading}>
            {isLoading ? "Creating..." : "Create Purchase Order"}
          </Button>
        </div>
      </form>
    </div>
  )
}