import Link from "next/link"
export const dynamic = "force-dynamic"

import { PageHeader } from "@/components/layout/page-header"
import { SectionHeader } from "@/components/layout/section-header"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Plus, Package, PackagePlus } from "lucide-react"
import { getProducts, getProductStats } from "@/lib/actions/inventory"
import { ProductList } from "./product-list"

export default async function InventoryPage({
  searchParams,
}: {
  searchParams: Promise<{ search?: string; page?: string; filter?: string }>
}) {
  const params = await searchParams
  const search = params.search
  const page = params.page ? parseInt(params.page) : 1
  const filter = (params.filter as "all" | "active" | "draft" | "low_stock") || "all"

  const [{ products, total, totalPages }, stats] = await Promise.all([
    getProducts({ search, page, filter }),
    getProductStats(),
  ])

  return (
    <div className="space-y-8">
      <PageHeader
        heading="Inventory"
        description="Manage your merchandise and products"
        actions={
          <Link href="/inventory/new">
            <Button>
              <Plus className="h-4 w-4" />
              Add Product
            </Button>
          </Link>
        }
      />

      {/* Stats */}
      <div className="grid gap-4 sm:grid-cols-4">
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold">{stats.total}</div>
            <p className="text-sm text-muted-foreground">Total Products</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold">{stats.active}</div>
            <p className="text-sm text-muted-foreground">Active</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-destructive">{stats.lowStock}</div>
            <p className="text-sm text-muted-foreground">Low Stock</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold">${stats.totalValue.toLocaleString()}</div>
            <p className="text-sm text-muted-foreground">Total Value</p>
          </CardContent>
        </Card>
      </div>

      <SectionHeader
        number="01"
        title="All Products"
        description="Your complete product catalog"
      />

      {products.length === 0 && !search ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-muted">
              <Package className="h-8 w-8 text-muted-foreground" />
            </div>
            <h3 className="mt-4 text-lg font-semibold">No products yet</h3>
            <p className="mt-1 text-sm text-muted-foreground text-center max-w-sm">
              Add your first product to start managing inventory and selling merchandise.
            </p>
            <Link href="/inventory/new" className="mt-6">
              <Button>
                <PackagePlus className="h-4 w-4" />
                Add Product
              </Button>
            </Link>
          </CardContent>
        </Card>
      ) : (
        <ProductList
          products={products as any}
          total={total}
          page={page}
          totalPages={totalPages}
          search={search}
          filter={filter}
        />
      )}
    </div>
  )
}
