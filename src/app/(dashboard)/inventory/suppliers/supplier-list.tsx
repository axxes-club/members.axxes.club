"use client"

import { useRouter } from "next/navigation"
import Link from "next/link"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Search, MoreHorizontal, Star, Phone, Mail, Globe, MapPin, ChevronLeft, ChevronRight, Building2 } from "lucide-react"
import { useCallback, useState, useTransition } from "react"
import type { Supplier, SupplierPart } from "@/lib/db/schema"

type SupplierWithParts = Supplier & {
  supplierParts?: SupplierPart[]
}

interface SupplierListProps {
  suppliers: SupplierWithParts[]
  total: number
  page: number
  totalPages: number
  search?: string
}

export function SupplierList({ suppliers, total, page, totalPages, search }: SupplierListProps) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [searchValue, setSearchValue] = useState(search || "")

  const updateSearch = useCallback((value: string) => {
    startTransition(() => {
      const params = new URLSearchParams()
      if (value) params.set("search", value)
      if (params.toString()) {
        router.push(`/inventory/suppliers?${params.toString()}`)
      } else {
        router.push("/inventory/suppliers")
      }
    })
  }, [router])

  const goToPage = useCallback((newPage: number) => {
    startTransition(() => {
      const params = new URLSearchParams()
      if (search) params.set("search", search)
      if (newPage > 1) params.set("page", newPage.toString())
      router.push(`/inventory/suppliers?${params.toString()}`)
    })
  }, [router, search])

  return (
    <div className="space-y-4">
      {/* Search */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <form
          className="relative flex-1 max-w-md"
          onSubmit={(e) => {
            e.preventDefault()
            updateSearch(searchValue)
          }}
        >
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search suppliers..."
            className="pl-10"
            value={searchValue}
            onChange={(e) => setSearchValue(e.target.value)}
          />
        </form>
        <div className="text-sm text-muted-foreground">
          {total} supplier{total !== 1 ? "s" : ""}
        </div>
      </div>

      {/* Table */}
      <div className={`rounded-lg border ${isPending ? "opacity-50" : ""}`}>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Supplier</TableHead>
              <TableHead>Contact</TableHead>
              <TableHead>Location</TableHead>
              <TableHead>Rating</TableHead>
              <TableHead>Parts</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="w-[50px]"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {suppliers.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-8">
                  <p className="text-muted-foreground">No suppliers found matching "{search}"</p>
                  <Button
                    variant="link"
                    onClick={() => {
                      setSearchValue("")
                      updateSearch("")
                    }}
                  >
                    Clear search
                  </Button>
                </TableCell>
              </TableRow>
            ) : (
              suppliers.map((supplier) => (
                <TableRow key={supplier.id} className="group">
                  <TableCell>
                    <Link href={`/inventory/suppliers/${supplier.id}`} className="flex items-center gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-muted">
                        <Building2 className="h-5 w-5 text-muted-foreground" />
                      </div>
                      <div>
                        <div className="font-medium">{supplier.name}</div>
                        {supplier.website && (
                          <div className="text-xs text-muted-foreground flex items-center gap-1">
                            <Globe className="h-3 w-3" />
                            {supplier.website.replace(/^https?:\/\//, "")}
                          </div>
                        )}
                      </div>
                    </Link>
                  </TableCell>
                  <TableCell>
                    <div className="space-y-1">
                      {supplier.email && (
                        <div className="text-sm flex items-center gap-1.5">
                          <Mail className="h-3.5 w-3.5 text-muted-foreground" />
                          <a href={`mailto:${supplier.email}`} className="hover:underline">
                            {supplier.email}
                          </a>
                        </div>
                      )}
                      {supplier.phone && (
                        <div className="text-sm flex items-center gap-1.5">
                          <Phone className="h-3.5 w-3.5 text-muted-foreground" />
                          <a href={`tel:${supplier.phone}`} className="hover:underline">
                            {supplier.phone}
                          </a>
                        </div>
                      )}
                      {!supplier.email && !supplier.phone && (
                        <span className="text-muted-foreground text-sm">—</span>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    {supplier.city || supplier.state || supplier.country ? (
                      <div className="text-sm flex items-center gap-1.5">
                        <MapPin className="h-3.5 w-3.5 text-muted-foreground" />
                        {[supplier.city, supplier.state, supplier.country].filter(Boolean).join(", ")}
                      </div>
                    ) : (
                      <span className="text-muted-foreground">—</span>
                    )}
                  </TableCell>
                  <TableCell>
                    {supplier.rating ? (
                      <div className="flex items-center gap-1">
                        {Array.from({ length: 5 }).map((_, i) => (
                          <Star
                            key={i}
                            className={`h-4 w-4 ${
                              i < supplier.rating!
                                ? "text-yellow-500 fill-yellow-500"
                                : "text-muted-foreground/30"
                            }`}
                          />
                        ))}
                      </div>
                    ) : (
                      <span className="text-muted-foreground">—</span>
                    )}
                  </TableCell>
                  <TableCell>
                    <Badge variant="secondary">
                      {supplier.supplierParts?.length || 0} parts
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Badge variant={supplier.isActive ? "default" : "secondary"}>
                      {supplier.isActive ? "Active" : "Inactive"}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem asChild>
                          <Link href={`/inventory/suppliers/${supplier.id}`}>
                            View details
                          </Link>
                        </DropdownMenuItem>
                        <DropdownMenuItem asChild>
                          <Link href={`/inventory/suppliers/${supplier.id}/edit`}>
                            Edit supplier
                          </Link>
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem asChild>
                          <Link href={`/inventory/purchase-orders/new?supplier=${supplier.id}`}>
                            Create purchase order
                          </Link>
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            Showing {(page - 1) * 20 + 1} to {Math.min(page * 20, total)} of {total} suppliers
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
    </div>
  )
}