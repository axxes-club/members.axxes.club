"use client"

import { useRouter } from "next/navigation"
import Link from "next/link"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Search, MoreHorizontal, ChevronLeft, ChevronRight } from "lucide-react"
import { useCallback, useState, useTransition } from "react"
import { format } from "date-fns"
import type { Order, OrderItem, Contact } from "@/lib/db/schema"

type OrderWithRelations = Order & {
  items: OrderItem[]
  contact: Contact | null
}

interface OrderListProps {
  orders: OrderWithRelations[]
  total: number
  page: number
  totalPages: number
  search?: string
  status: string
}

export function OrderList({ orders, total, page, totalPages, search, status }: OrderListProps) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [searchValue, setSearchValue] = useState(search || "")

  const updateSearch = useCallback((value: string) => {
    startTransition(() => {
      const params = new URLSearchParams()
      if (value) params.set("search", value)
      if (status !== "all") params.set("status", status)
      router.push(`/orders?${params.toString()}`)
    })
  }, [router, status])

  const updateStatus = useCallback((newStatus: string) => {
    startTransition(() => {
      const params = new URLSearchParams()
      if (search) params.set("search", search)
      if (newStatus !== "all") params.set("status", newStatus)
      router.push(`/orders?${params.toString()}`)
    })
  }, [router, search])

  const goToPage = useCallback((newPage: number) => {
    startTransition(() => {
      const params = new URLSearchParams()
      if (search) params.set("search", search)
      if (status !== "all") params.set("status", status)
      if (newPage > 1) params.set("page", newPage.toString())
      router.push(`/orders?${params.toString()}`)
    })
  }, [router, search, status])

  function getStatusVariant(orderStatus: string) {
    switch (orderStatus) {
      case "delivered":
        return "success" as const
      case "processing":
      case "shipped":
        return "default" as const
      case "pending":
      case "confirmed":
        return "warning" as const
      case "cancelled":
      case "refunded":
        return "destructive" as const
      default:
        return "secondary" as const
    }
  }

  function getPaymentVariant(paymentStatus: string) {
    switch (paymentStatus) {
      case "captured":
        return "success" as const
      case "authorized":
        return "default" as const
      case "pending":
        return "warning" as const
      case "failed":
      case "refunded":
        return "destructive" as const
      default:
        return "secondary" as const
    }
  }

  return (
    <>
      {/* Search & Filters */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
        <form
          className="relative flex-1"
          onSubmit={(e) => {
            e.preventDefault()
            updateSearch(searchValue)
          }}
        >
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search orders..."
            className="pl-10"
            value={searchValue}
            onChange={(e) => setSearchValue(e.target.value)}
          />
        </form>
        <div className="flex gap-2 flex-wrap">
          {["all", "pending", "processing", "shipped", "delivered", "cancelled"].map((s) => (
            <Button
              key={s}
              variant={status === s ? "default" : "outline"}
              size="sm"
              onClick={() => updateStatus(s)}
            >
              {s.charAt(0).toUpperCase() + s.slice(1)}
            </Button>
          ))}
        </div>
      </div>

      <Card className={isPending ? "opacity-50" : ""}>
        <CardContent className="p-0">
          {orders.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12">
              <p className="text-muted-foreground">No orders found</p>
              {search && (
                <Button
                  variant="link"
                  onClick={() => {
                    setSearchValue("")
                    updateSearch("")
                  }}
                >
                  Clear search
                </Button>
              )}
            </div>
          ) : (
            <>
              {/* Table Header */}
              <div className="hidden border-b bg-muted/50 px-4 py-3 sm:grid sm:grid-cols-6 sm:gap-4">
                <span className="text-sm font-medium text-muted-foreground">Order</span>
                <span className="text-sm font-medium text-muted-foreground">Customer</span>
                <span className="text-sm font-medium text-muted-foreground">Status</span>
                <span className="text-sm font-medium text-muted-foreground">Payment</span>
                <span className="text-sm font-medium text-muted-foreground">Total</span>
                <span className="text-sm font-medium text-muted-foreground">Date</span>
              </div>

              {/* Table Body */}
              <div className="divide-y">
                {orders.map((order) => (
                  <Link
                    key={order.id}
                    href={`/orders/${order.id}`}
                    className="grid gap-2 p-4 sm:grid-cols-6 sm:items-center sm:gap-4 hover:bg-accent/50 transition-colors"
                  >
                    <div>
                      <p className="font-medium">{order.orderNumber}</p>
                      <p className="text-sm text-muted-foreground sm:hidden">
                        {order.customerFirstName} {order.customerLastName}
                      </p>
                    </div>
                    <div className="hidden sm:block">
                      <p className="font-medium">
                        {order.customerFirstName} {order.customerLastName}
                      </p>
                      <p className="text-sm text-muted-foreground">{order.customerEmail}</p>
                    </div>
                    <div>
                      <Badge variant={getStatusVariant(order.status)}>
                        {order.status}
                      </Badge>
                    </div>
                    <div className="hidden sm:block">
                      <Badge variant={getPaymentVariant(order.paymentStatus)}>
                        {order.paymentStatus}
                      </Badge>
                    </div>
                    <div>
                      <span className="font-medium">${Number(order.total).toFixed(2)}</span>
                      <span className="text-sm text-muted-foreground ml-2">
                        ({order.items.length} items)
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">
                        {format(new Date(order.createdAt), "MMM d, yyyy")}
                      </span>
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        onClick={(e) => e.preventDefault()}
                      >
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </div>
                  </Link>
                ))}
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            Showing {(page - 1) * 20 + 1} to {Math.min(page * 20, total)} of {total} orders
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
