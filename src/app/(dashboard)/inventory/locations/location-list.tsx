"use client"

import { useRouter } from "next/navigation"
import Link from "next/link"
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
import { Search, MoreHorizontal, MapPin, ChevronLeft, ChevronRight, Building2, Star, Package } from "lucide-react"
import { useCallback, useState, useTransition } from "react"
import type { InventoryLocation } from "@/lib/db/schema"

interface LocationListProps {
  locations: InventoryLocation[]
  total: number
  page: number
  totalPages: number
  search?: string
}

export function LocationList({ locations, total, page, totalPages, search }: LocationListProps) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [searchValue, setSearchValue] = useState(search || "")

  const updateSearch = useCallback((value: string) => {
    startTransition(() => {
      const params = new URLSearchParams()
      if (value) params.set("search", value)
      if (params.toString()) {
        router.push(`/inventory/locations?${params.toString()}`)
      } else {
        router.push("/inventory/locations")
      }
    })
  }, [router])

  const goToPage = useCallback((newPage: number) => {
    startTransition(() => {
      const params = new URLSearchParams()
      if (search) params.set("search", search)
      if (newPage > 1) params.set("page", newPage.toString())
      router.push(`/inventory/locations?${params.toString()}`)
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
            placeholder="Search locations..."
            className="pl-10"
            value={searchValue}
            onChange={(e) => setSearchValue(e.target.value)}
          />
        </form>
        <div className="text-sm text-muted-foreground">
          {total} location{total !== 1 ? "s" : ""}
        </div>
      </div>

      {/* Table */}
      <div className={`rounded-lg border ${isPending ? "opacity-50" : ""}`}>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Location</TableHead>
              <TableHead>Address</TableHead>
              <TableHead>Code</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Default</TableHead>
              <TableHead className="w-[50px]"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {locations.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-8">
                  <p className="text-muted-foreground">No locations found matching "{search}"</p>
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
              locations.map((location) => (
                <TableRow key={location.id} className="group">
                  <TableCell>
                    <Link href={`/inventory/locations/${location.id}`} className="flex items-center gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-muted">
                        <Building2 className="h-5 w-5 text-muted-foreground" />
                      </div>
                      <div>
                        <div className="font-medium">{location.name}</div>
                      </div>
                    </Link>
                  </TableCell>
                  <TableCell>
                    {location.city || location.state || location.country ? (
                      <div className="text-sm flex items-center gap-1.5">
                        <MapPin className="h-3.5 w-3.5 text-muted-foreground" />
                        {[location.addressLine1, location.city, location.state, location.country]
                          .filter(Boolean)
                          .slice(0, 3)
                          .join(", ")}
                      </div>
                    ) : (
                      <span className="text-muted-foreground">—</span>
                    )}
                  </TableCell>
                  <TableCell>
                    {location.code ? (
                      <Badge variant="outline">{location.code}</Badge>
                    ) : (
                      <span className="text-muted-foreground">—</span>
                    )}
                  </TableCell>
                  <TableCell>
                    <Badge variant={location.isActive ? "default" : "secondary"}>
                      {location.isActive ? "Active" : "Inactive"}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {location.isDefault && (
                      <Star className="h-4 w-4 text-yellow-500 fill-yellow-500" />
                    )}
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
                          <Link href={`/inventory/locations/${location.id}`}>
                            View details
                          </Link>
                        </DropdownMenuItem>
                        <DropdownMenuItem asChild>
                          <Link href={`/inventory/locations/${location.id}/edit`}>
                            Edit location
                          </Link>
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem asChild>
                          <Link href={`/inventory/stock?location=${location.id}`}>
                            View stock
                          </Link>
                        </DropdownMenuItem>
                        <DropdownMenuItem asChild>
                          <Link href={`/inventory/transfers/new?from=${location.id}`}>
                            Create transfer
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
            Showing {(page - 1) * 20 + 1} to {Math.min(page * 20, total)} of {total} locations
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