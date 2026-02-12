import Link from "next/link"
import { PageHeader } from "@/components/layout/page-header"
import { SectionHeader } from "@/components/layout/section-header"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { ShoppingBag } from "lucide-react"
import { getOrders, getOrderStats } from "@/lib/actions/orders"
import { OrderList } from "./order-list"
import { format } from "date-fns"

export default async function OrdersPage({
  searchParams,
}: {
  searchParams: Promise<{ search?: string; page?: string; status?: string }>
}) {
  const params = await searchParams
  const search = params.search
  const page = params.page ? parseInt(params.page) : 1
  const status = params.status || "all"

  const [{ orders, total, totalPages }, stats] = await Promise.all([
    getOrders({ search, page, status }),
    getOrderStats(),
  ])

  return (
    <div className="space-y-8">
      <PageHeader
        heading="Orders"
        description="Manage customer orders and fulfillment"
      />

      {/* Stats */}
      <div className="grid gap-4 sm:grid-cols-4">
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold">{stats.total}</div>
            <p className="text-sm text-muted-foreground">Total Orders</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-orange-500">{stats.pending}</div>
            <p className="text-sm text-muted-foreground">Pending</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-green-600">{stats.fulfilled}</div>
            <p className="text-sm text-muted-foreground">Fulfilled</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold">${stats.revenue.toLocaleString()}</div>
            <p className="text-sm text-muted-foreground">Revenue</p>
          </CardContent>
        </Card>
      </div>

      <SectionHeader
        number="01"
        title="All Orders"
        description="View and manage customer orders"
      />

      {orders.length === 0 && !search ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-muted">
              <ShoppingBag className="h-8 w-8 text-muted-foreground" />
            </div>
            <h3 className="mt-4 text-lg font-semibold">No orders yet</h3>
            <p className="mt-1 text-sm text-muted-foreground text-center max-w-sm">
              Orders will appear here when customers make purchases from your events or store.
            </p>
          </CardContent>
        </Card>
      ) : (
        <OrderList
          orders={orders}
          total={total}
          page={page}
          totalPages={totalPages}
          search={search}
          status={status}
        />
      )}
    </div>
  )
}
