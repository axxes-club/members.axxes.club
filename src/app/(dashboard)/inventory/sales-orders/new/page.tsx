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
import { createSalesOrder, getProductsForSalesOrders } from "@/lib/actions/inventory-orders"

interface ProductSelect {
  id: string
  name: string
  sku: string | null
  price: string
}

interface LineItem {
  id: string
  productId: string
  description: string
  sku: string
  quantity: number
  unitPrice: string
}

export default function NewSalesOrderPage() {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [products, setProducts] = useState<ProductSelect[]>([])
  const [lineItems, setLineItems] = useState<LineItem[]>([
    { id: crypto.randomUUID(), productId: "", description: "", sku: "", quantity: 1, unitPrice: "" }
  ])

  useEffect(() => {
    async function loadData() {
      try {
        const productsData = await getProductsForSalesOrders()
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
        if (field === "productId" && value) {
          const product = products.find(p => p.id === value)
          if (product) {
            updated.description = product.name
            updated.sku = product.sku || ""
            updated.unitPrice = product.price
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
      customerName: formData.get("customerName") as string,
      customerEmail: formData.get("customerEmail") as string,
      customerPhone: formData.get("customerPhone") as string,
      currency: "USD",
      orderDate: formData.get("orderDate") as string,
      targetDate: formData.get("targetDate") as string,
      shippingAddressLine1: formData.get("shippingAddressLine1") as string,
      shippingAddressLine2: formData.get("shippingAddressLine2") as string,
      shippingCity: formData.get("shippingCity") as string,
      shippingState: formData.get("shippingState") as string,
      shippingPostalCode: formData.get("shippingPostalCode") as string,
      shippingCountry: formData.get("shippingCountry") as string,
      notes: formData.get("notes") as string,
    }

    const items = lineItems
      .filter(item => item.description)
      .map(item => ({
        productId: item.productId || undefined,
        description: item.description,
        sku: item.sku || undefined,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
      }))

    try {
      const order = await createSalesOrder(data, items)
      router.push(`/inventory/sales-orders/${order.id}`)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create sales order")
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="space-y-8">
      <PageHeader
        heading="Create Sales Order"
        description="Create a new sales order for a customer"
        actions={
          <Link href="/inventory/sales-orders">
            <Button variant="outline">
              <ArrowLeft className="h-4 w-4" />
              Back
            </Button>
          </Link>
        }
      />

      <form onSubmit={handleSubmit}>
        <SectionHeader number="01" title="Customer Information" />

        <Card className="mt-4">
          <CardContent className="p-6 space-y-6">
            {error && (
              <div className="bg-destructive/10 p-3 text-sm text-destructive">
                {error}
              </div>
            )}

            <div className="grid gap-4 sm:grid-cols-3">
              <div className="space-y-2">
                <Label htmlFor="customerName">Customer Name *</Label>
                <Input id="customerName" name="customerName" placeholder="John Doe" required />
              </div>

              <div className="space-y-2">
                <Label htmlFor="customerEmail">Email</Label>
                <Input id="customerEmail" name="customerEmail" type="email" placeholder="john@example.com" />
              </div>

              <div className="space-y-2">
                <Label htmlFor="customerPhone">Phone</Label>
                <Input id="customerPhone" name="customerPhone" placeholder="+1 (555) 123-4567" />
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="orderDate">Order Date</Label>
                <Input id="orderDate" name="orderDate" type="date" defaultValue={new Date().toISOString().split("T")[0]} />
              </div>

              <div className="space-y-2">
                <Label htmlFor="targetDate">Target Ship Date</Label>
                <Input id="targetDate" name="targetDate" type="date" />
              </div>
            </div>
          </CardContent>
        </Card>

        <SectionHeader number="02" title="Shipping Address" className="mt-8" />

        <Card className="mt-4">
          <CardContent className="p-6 space-y-6">
            <div className="space-y-2">
              <Label htmlFor="shippingAddressLine1">Address Line 1</Label>
              <Input id="shippingAddressLine1" name="shippingAddressLine1" placeholder="123 Main St" />
            </div>

            <div className="space-y-2">
              <Label htmlFor="shippingAddressLine2">Address Line 2</Label>
              <Input id="shippingAddressLine2" name="shippingAddressLine2" placeholder="Suite 100" />
            </div>

            <div className="grid gap-4 sm:grid-cols-4">
              <div className="space-y-2">
                <Label htmlFor="shippingCity">City</Label>
                <Input id="shippingCity" name="shippingCity" placeholder="New York" />
              </div>

              <div className="space-y-2">
                <Label htmlFor="shippingState">State</Label>
                <Input id="shippingState" name="shippingState" placeholder="NY" />
              </div>

              <div className="space-y-2">
                <Label htmlFor="shippingPostalCode">Postal Code</Label>
                <Input id="shippingPostalCode" name="shippingPostalCode" placeholder="10001" />
              </div>

              <div className="space-y-2">
                <Label htmlFor="shippingCountry">Country</Label>
                <select id="shippingCountry" name="shippingCountry" className="w-full border border-input bg-background px-3 py-2 text-sm">
                  <option value="US">United States</option>
                  <option value="CA">Canada</option>
                  <option value="GB">United Kingdom</option>
                </select>
              </div>
            </div>
          </CardContent>
        </Card>

        <SectionHeader number="03" title="Line Items" className="mt-8" />

        <Card className="mt-4">
          <CardContent className="p-6">
            <div className="space-y-4">
              {lineItems.map((item) => (
                <div key={item.id} className="grid gap-4 sm:grid-cols-12 items-start">
                  <div className="sm:col-span-3">
                    <Label className="text-xs text-muted-foreground">Product</Label>
                    <select
                      value={item.productId}
                      onChange={(e) => updateLineItem(item.id, "productId", e.target.value)}
                      className="w-full border border-input bg-background px-3 py-2 text-sm"
                    >
                      <option value="">Select product</option>
                      {products.map((product) => (
                        <option key={product.id} value={product.id}>{product.name}</option>
                      ))}
                    </select>
                  </div>

                  <div className="sm:col-span-3">
                    <Label className="text-xs text-muted-foreground">Description *</Label>
                    <Input value={item.description} onChange={(e) => updateLineItem(item.id, "description", e.target.value)} required />
                  </div>

                  <div className="sm:col-span-2">
                    <Label className="text-xs text-muted-foreground">Qty</Label>
                    <Input type="number" min="1" value={item.quantity} onChange={(e) => updateLineItem(item.id, "quantity", parseInt(e.target.value) || 1)} />
                  </div>

                  <div className="sm:col-span-2">
                    <Label className="text-xs text-muted-foreground">Unit Price</Label>
                    <Input type="number" step="0.01" value={item.unitPrice} onChange={(e) => updateLineItem(item.id, "unitPrice", e.target.value)} />
                  </div>

                  <div className="sm:col-span-2 flex items-end">
                    <Button type="button" variant="ghost" size="icon" onClick={() => removeLineItem(item.id)} disabled={lineItems.length === 1}>
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
          <Link href="/inventory/sales-orders">
            <Button type="button" variant="outline">Cancel</Button>
          </Link>
          <Button type="submit" disabled={isLoading}>{isLoading ? "Creating..." : "Create Sales Order"}</Button>
        </div>
      </form>
    </div>
  )
}