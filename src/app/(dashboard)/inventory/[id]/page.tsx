import Link from "next/link"
export const dynamic = "force-dynamic"

import { notFound } from "next/navigation"
import { PageHeader } from "@/components/layout/page-header"
import { SectionHeader } from "@/components/layout/section-header"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { ArrowLeft, Package, Pencil } from "lucide-react"
import { getProduct } from "@/lib/actions/inventory"
import { ProductActions } from "./product-actions"

export default async function ProductDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params

  let product: Awaited<ReturnType<typeof getProduct>>
  try {
    product = await getProduct(id)
  } catch {
    notFound()
  }

  function getStockStatus(): { label: string; variant: "success" | "destructive" | "warning" | "secondary" } {
    if (!product.trackInventory) return { label: "Not tracked", variant: "secondary" as const }
    if (product.quantity === 0) return { label: "Out of stock", variant: "destructive" as const }
    if ((product.quantity || 0) <= (product.lowStockThreshold || 5)) {
      return { label: "Low stock", variant: "warning" as const }
    }
    return { label: "In stock", variant: "success" as const }
  }

  const stockStatus = getStockStatus()
  const profit = product.costPrice
    ? Number(product.price) - Number(product.costPrice)
    : null
  const margin = profit && Number(product.price) > 0
    ? (profit / Number(product.price)) * 100
    : null

  return (
    <div className="space-y-8">
      <PageHeader
        heading={product.name}
        description={product.shortDescription || "Product details"}
        actions={
          <div className="flex gap-2">
            <Link href="/inventory">
              <Button variant="outline">
                <ArrowLeft className="h-4 w-4" />
                Back
              </Button>
            </Link>
            <Link href={`/inventory/${id}/edit`}>
              <Button>
                <Pencil className="h-4 w-4" />
                Edit
              </Button>
            </Link>
          </div>
        }
      />

      <div className="grid gap-8 lg:grid-cols-3 items-start">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          <SectionHeader number="01" title="Product Information" />

          <Card>
            <CardContent className="p-6">
              <div className="flex flex-col sm:flex-row gap-6">
                <div className="w-full sm:w-48 aspect-square rounded-lg bg-muted flex items-center justify-center shrink-0">
                  {product.images && product.images.length > 0 ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={product.images[0].url}
                      alt={product.images[0].alt || product.name}
                      className="w-full h-full object-cover rounded-lg"
                    />
                  ) : (
                    <Package className="h-16 w-16 text-muted-foreground" />
                  )}
                </div>

                <div className="flex-1 space-y-4">
                  <div className="flex items-center gap-3">
                    <Badge
                      variant={
                        product.status === "active"
                          ? "success"
                          : product.status === "archived"
                          ? "secondary"
                          : "outline"
                      }
                    >
                      {product.status}
                    </Badge>
                    <Badge variant={stockStatus.variant}>
                      {stockStatus.label}
                    </Badge>
                    {product.isFeatured && <Badge variant="outline">Featured</Badge>}
                  </div>

                  <div>
                    <h2 className="text-2xl font-bold">{product.name}</h2>
                    {product.category && typeof product.category === 'object' && !Array.isArray(product.category) && (
                      <p className="text-sm text-muted-foreground mt-1">
                        Category: {(product.category as { name: string }).name}
                      </p>
                    )}
                  </div>

                  <div className="flex gap-6">
                    <div>
                      <p className="text-sm text-muted-foreground">Price</p>
                      <p className="text-2xl font-bold">${Number(product.price).toFixed(2)}</p>
                    </div>
                    {product.compareAtPrice && Number(product.compareAtPrice) > 0 && (
                      <div>
                        <p className="text-sm text-muted-foreground">Compare at</p>
                        <p className="text-lg line-through text-muted-foreground">
                          ${Number(product.compareAtPrice).toFixed(2)}
                        </p>
                      </div>
                    )}
                  </div>

                  <div className="flex gap-4 text-sm">
                    {product.sku && (
                      <div>
                        <span className="text-muted-foreground">SKU:</span> {product.sku}
                      </div>
                    )}
                    {product.barcode && (
                      <div>
                        <span className="text-muted-foreground">Barcode:</span> {product.barcode}
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {product.description && (
                <div className="border-t pt-6 mt-6">
                  <h3 className="font-medium mb-2">Description</h3>
                  <p className="whitespace-pre-wrap text-sm text-muted-foreground">
                    {product.description}
                  </p>
                </div>
              )}
            </CardContent>
          </Card>

          {product.variants.length > 0 && (
            <>
              <SectionHeader number="02" title="Variants" />
              <div className="space-y-4">
                {product.variants.map((variant) => (
                  <Card key={variant.id}>
                    <CardContent className="p-4 flex items-center justify-between">
                      <div>
                        <p className="font-medium">{variant.name || "Default"}</p>
                        {variant.sku && (
                          <p className="text-sm text-muted-foreground">SKU: {variant.sku}</p>
                        )}
                      </div>
                      <div className="text-right">
                        <p className="font-bold">${Number(variant.price).toFixed(2)}</p>
                        <p className="text-sm text-muted-foreground">
                          {variant.quantity} in stock
                        </p>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </>
          )}
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          <SectionHeader title="Overview" />

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Inventory</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="text-center">
                <p className="text-4xl font-bold">{product.quantity || 0}</p>
                <p className="text-sm text-muted-foreground">
                  {product.trackInventory ? "units in stock" : "not tracking"}
                </p>
              </div>
              {product.trackInventory && (
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Low stock alert</span>
                    <span>{product.lowStockThreshold || 5} units</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Allow backorder</span>
                    <span>{product.allowBackorder ? "Yes" : "No"}</span>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Financials</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Price</span>
                <span className="font-medium">${Number(product.price).toFixed(2)}</span>
              </div>
              {product.costPrice && (
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Cost</span>
                  <span className="font-medium">${Number(product.costPrice).toFixed(2)}</span>
                </div>
              )}
              {profit !== null && (
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Profit</span>
                  <span className="font-medium text-green-600">${profit.toFixed(2)}</span>
                </div>
              )}
              {margin !== null && (
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Margin</span>
                  <span className="font-medium">{margin.toFixed(1)}%</span>
                </div>
              )}
              <div className="border-t pt-3 mt-3">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Total value</span>
                  <span className="font-bold">
                    ${(Number(product.price) * (product.quantity || 0)).toFixed(2)}
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>

          {product.tags && product.tags.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Tags</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-2">
                  {product.tags.map((tag, i) => (
                    <Badge key={i} variant="outline">
                      {tag}
                    </Badge>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          <ProductActions productId={id} status={product.status} />
        </div>
      </div>
    </div>
  )
}
