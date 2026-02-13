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
import { ArrowLeft, Loader2 } from "lucide-react"
import { getProduct, updateProduct, getCategories } from "@/lib/actions/inventory"
import type { ProductCategory } from "@/lib/db/schema"

export default function EditProductPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(false)
  const [isFetching, setIsFetching] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [categories, setCategories] = useState<ProductCategory[]>([])
  const [product, setProduct] = useState<Awaited<ReturnType<typeof getProduct>> | null>(null)
  const [productId, setProductId] = useState<string>("")

  useEffect(() => {
    async function load() {
      const { id } = await params
      setProductId(id)

      try {
        const [productData, cats] = await Promise.all([
          getProduct(id),
          getCategories(),
        ])
        setProduct(productData)
        setCategories(cats)
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load product")
      } finally {
        setIsFetching(false)
      }
    }
    load()
  }, [params])

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setIsLoading(true)
    setError(null)

    const formData = new FormData(e.currentTarget)
    const data = {
      name: formData.get("name") as string,
      description: formData.get("description") as string,
      price: formData.get("price") as string,
      compareAtPrice: formData.get("compareAtPrice") as string,
      costPrice: formData.get("costPrice") as string,
      sku: formData.get("sku") as string,
      barcode: formData.get("barcode") as string,
      quantity: parseInt(formData.get("quantity") as string) || 0,
      categoryId: formData.get("categoryId") as string,
      trackInventory: formData.get("trackInventory") === "on",
      lowStockThreshold: parseInt(formData.get("lowStockThreshold") as string) || 5,
    }

    try {
      await updateProduct(productId, data)
      router.push(`/inventory/${productId}`)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update product")
    } finally {
      setIsLoading(false)
    }
  }

  if (isFetching) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (!product) {
    return (
      <div className="space-y-8">
        <PageHeader
          heading="Product Not Found"
          description="The product you're looking for doesn't exist"
          actions={
            <Link href="/inventory">
              <Button variant="outline">
                <ArrowLeft className="h-4 w-4" />
                Back
              </Button>
            </Link>
          }
        />
      </div>
    )
  }

  return (
    <div className="space-y-8">
      <PageHeader
        heading={`Edit ${product.name}`}
        description="Update product details"
        actions={
          <Link href={`/inventory/${productId}`}>
            <Button variant="outline">
              <ArrowLeft className="h-4 w-4" />
              Cancel
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

            <div className="space-y-2">
              <Label htmlFor="name">Product Name *</Label>
              <Input
                id="name"
                name="name"
                placeholder="Event T-Shirt"
                defaultValue={product.name}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <textarea
                id="description"
                name="description"
                rows={4}
                className="w-full border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                placeholder="Product description..."
                defaultValue={product.description || ""}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="categoryId">Category</Label>
              <select
                id="categoryId"
                name="categoryId"
                defaultValue={product.categoryId || ""}
                className="w-full border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
              >
                <option value="">No category</option>
                {categories.map((cat) => (
                  <option key={cat.id} value={cat.id}>
                    {cat.name}
                  </option>
                ))}
              </select>
            </div>
          </CardContent>
        </Card>

        <SectionHeader number="02" title="Pricing" className="mt-8" />

        <Card className="mt-4">
          <CardContent className="p-6 space-y-6">
            <div className="grid gap-4 sm:grid-cols-3">
              <div className="space-y-2">
                <Label htmlFor="price">Price *</Label>
                <Input
                  id="price"
                  name="price"
                  type="number"
                  step="0.01"
                  min="0"
                  placeholder="29.99"
                  defaultValue={Number(product.price).toFixed(2)}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="compareAtPrice">Compare at Price</Label>
                <Input
                  id="compareAtPrice"
                  name="compareAtPrice"
                  type="number"
                  step="0.01"
                  min="0"
                  placeholder="39.99"
                  defaultValue={product.compareAtPrice ? Number(product.compareAtPrice).toFixed(2) : ""}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="costPrice">Cost Price</Label>
                <Input
                  id="costPrice"
                  name="costPrice"
                  type="number"
                  step="0.01"
                  min="0"
                  placeholder="15.00"
                  defaultValue={product.costPrice ? Number(product.costPrice).toFixed(2) : ""}
                />
              </div>
            </div>
          </CardContent>
        </Card>

        <SectionHeader number="03" title="Inventory" className="mt-8" />

        <Card className="mt-4">
          <CardContent className="p-6 space-y-6">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="sku">SKU</Label>
                <Input
                  id="sku"
                  name="sku"
                  placeholder="TSHIRT-001"
                  defaultValue={product.sku || ""}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="barcode">Barcode</Label>
                <Input
                  id="barcode"
                  name="barcode"
                  placeholder="123456789012"
                  defaultValue={product.barcode || ""}
                />
              </div>
            </div>

            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="trackInventory"
                name="trackInventory"
                defaultChecked={product.trackInventory ?? true}
                className="h-4 w-4 border-input"
              />
              <Label htmlFor="trackInventory">Track inventory for this product</Label>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="quantity">Quantity</Label>
                <Input
                  id="quantity"
                  name="quantity"
                  type="number"
                  min="0"
                  defaultValue={product.quantity ?? 0}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="lowStockThreshold">Low Stock Threshold</Label>
                <Input
                  id="lowStockThreshold"
                  name="lowStockThreshold"
                  type="number"
                  min="0"
                  defaultValue={product.lowStockThreshold ?? 5}
                />
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="mt-8 flex justify-end gap-4">
          <Link href={`/inventory/${productId}`}>
            <Button type="button" variant="outline">
              Cancel
            </Button>
          </Link>
          <Button type="submit" disabled={isLoading}>
            {isLoading ? "Saving..." : "Save Changes"}
          </Button>
        </div>
      </form>
    </div>
  )
}
