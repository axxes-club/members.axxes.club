import Link from "next/link"
export const dynamic = "force-dynamic"

import { PageHeader } from "@/components/layout/page-header"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Plus, Truck } from "lucide-react"
import { getSuppliers, getSupplierStats } from "@/lib/actions/inventory-suppliers"
import { SupplierList } from "./supplier-list"
import { SupplierStats } from "./supplier-stats"

export default async function SuppliersPage({
  searchParams,
}: {
  searchParams: Promise<{ search?: string; page?: string }>
}) {
  const params = await searchParams
  const search = params.search
  const page = params.page ? parseInt(params.page) : 1

  const [{ suppliers, total, totalPages }, stats] = await Promise.all([
    getSuppliers({ search, page }),
    getSupplierStats(),
  ])

  return (
    <div className="space-y-8">
      <PageHeader
        heading="Suppliers"
        description="Manage your suppliers and vendor relationships"
        actions={
          <Link href="/inventory/suppliers/new">
            <Button>
              <Plus className="h-4 w-4" />
              Add Supplier
            </Button>
          </Link>
        }
      />

      {/* Stats */}
      <SupplierStats stats={stats} />

      {suppliers.length === 0 && !search ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-muted">
              <Truck className="h-8 w-8 text-muted-foreground" />
            </div>
            <h3 className="mt-4 text-lg font-semibold">No suppliers yet</h3>
            <p className="mt-1 text-sm text-muted-foreground text-center max-w-sm">
              Add your first supplier to start managing vendor relationships and purchase orders.
            </p>
            <Link href="/inventory/suppliers/new" className="mt-6">
              <Button>
                <Plus className="h-4 w-4" />
                Add Supplier
              </Button>
            </Link>
          </CardContent>
        </Card>
      ) : (
        <SupplierList
          suppliers={suppliers}
          total={total}
          page={page}
          totalPages={totalPages}
          search={search}
        />
      )}
    </div>
  )
}