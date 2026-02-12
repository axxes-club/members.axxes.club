"use client"

import { useRouter } from "next/navigation"
import Link from "next/link"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Search, Package, ChevronLeft, ChevronRight } from "lucide-react"
import { useCallback, useState, useTransition } from "react"
import type { Product, ProductCategory, ProductVariant } from "@/lib/db/schema"

type ProductWithRelations = Product & {
  category: ProductCategory | null
  variants: ProductVariant[]
}

interface ProductListProps {
  products: ProductWithRelations[]
  total: number
  page: number
  totalPages: number
  search?: string
  filter: string
}

export function ProductList({ products, total, page, totalPages, search, filter }: ProductListProps) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [searchValue, setSearchValue] = useState(search || "")

  const updateSearch = useCallback((value: string) => {
    startTransition(() => {
      const params = new URLSearchParams()
      if (value) params.set("search", value)
      if (filter !== "all") params.set("filter", filter)
      router.push(`/inventory?${params.toString()}`)
    })
  }, [router, filter])

  const updateFilter = useCallback((newFilter: string) => {
    startTransition(() => {
      const params = new URLSearchParams()
      if (search) params.set("search", search)
      if (newFilter !== "all") params.set("filter", newFilter)
      router.push(`/inventory?${params.toString()}`)
    })
  }, [router, search])

  const goToPage = useCallback((newPage: number) => {
    startTransition(() => {
      const params = new URLSearchParams()
      if (search) params.set("search", search)
      if (filter !== "all") params.set("filter", filter)
      if (newPage > 1) params.set("page", newPage.toString())
      router.push(`/inventory?${params.toString()}`)
    })
  }, [router, search, filter])

  function getStockStatus(product: ProductWithRelations) {
    if (!product.trackInventory) return { label: "Not tracked", variant: "secondary" as const }
    if (product.quantity === 0) return { label: "Out of stock", variant: "destructive" as const }
    if ((product.quantity || 0) <= (product.lowStockThreshold || 5)) {
      return { label: "Low stock", variant: "warning" as const }
    }
    return { label: `${product.quantity} in stock`, variant: "secondary" as const }
  }

  return (
    <>
      {/* Search & Filters */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
        <form
          className="relative flex-1 max-w-md"
          onSubmit={(e) => {
            e.preventDefault()
            updateSearch(searchValue)
          }}
        >
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search products..."
            className="pl-10"
            value={searchValue}
            onChange={(e) => setSearchValue(e.target.value)}
          />
        </form>
        <div className="flex gap-2">
          {["all", "active", "draft", "low_stock"].map((f) => (
            <Button
              key={f}
              variant={filter === f ? "default" : "outline"}
              size="sm"
              onClick={() => updateFilter(f)}
            >
              {f === "low_stock" ? "Low Stock" : f.charAt(0).toUpperCase() + f.slice(1)}
            </Button>
          ))}
        </div>
      </div>

      <div className={`grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 ${isPending ? "opacity-50" : ""}`}>
        {products.length === 0 ? (
          <div className="col-span-full">
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12">
                <p className="text-muted-foreground">No products found matching &quot;{search}&quot;</p>
                <Button
                  variant="link"
                  onClick={() => {
                    setSearchValue("")
                    updateSearch("")
                  }}
                >
                  Clear search
                </Button>
              </CardContent>
            </Card>
          </div>
        ) : (
          products.map((product) => {
            const stockStatus = getStockStatus(product)
            return (
              <Link key={product.id} href={`/inventory/${product.id}`}>
                <Card interactive>
                  <CardContent className="p-4">
                    <div className="aspect-square rounded-md bg-muted flex items-center justify-center mb-4">
                      {product.images && product.images.length > 0 ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={product.images[0].url}
                          alt={product.images[0].alt || product.name}
                          className="w-full h-full object-cover rounded-md"
                        />
                      ) : (
                        <Package className="h-12 w-12 text-muted-foreground" />
                      )}
                    </div>
                    <div className="space-y-2">
                      <div className="flex items-start justify-between gap-2">
                        <h3 className="font-medium line-clamp-1">{product.name}</h3>
                        <Badge variant={stockStatus.variant}>
                          {stockStatus.label}
                        </Badge>
                      </div>
                      <div className="flex items-center justify-between">
                        <p className="text-lg font-bold">
                          ${Number(product.price).toFixed(2)}
                        </p>
                        {product.category && (
                          <span className="text-xs text-muted-foreground">
                            {product.category.name}
                          </span>
                        )}
                      </div>
                      {product.sku && (
                        <p className="text-xs text-muted-foreground">
                          SKU: {product.sku}
                        </p>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </Link>
            )
          })
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            Showing {(page - 1) * 20 + 1} to {Math.min(page * 20, total)} of {total} products
          </p>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => goToPage(page - 1)}
              disabled={page <= 1}
            >
              <ChevronLeft className="h-4 w-4" />
              Previous
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => goToPage(page + 1)}
              disabled={page >= totalPages}
            >
              Next
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}
    </>
  )
}
