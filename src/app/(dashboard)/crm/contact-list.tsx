"use client"

import { useRouter, useSearchParams } from "next/navigation"
import Link from "next/link"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Checkbox } from "@/components/ui/checkbox"
import { Search, MoreHorizontal, ChevronLeft, ChevronRight } from "lucide-react"
import { useCallback, useState, useTransition } from "react"
import { AdvancedFilters, ActiveFiltersDisplay, type FilterState } from "./advanced-filters"
import type { Contact } from "@/lib/db/schema"

interface ContactListProps {
  contacts: Contact[]
  total: number
  page: number
  totalPages: number
  search?: string
  filterMetadata: {
    leadSources: string[]
    tags: string[]
    types: string[]
    leadStatuses: string[]
  }
}

export function ContactList({ contacts, total, page, totalPages, search, filterMetadata }: ContactListProps) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [isPending, startTransition] = useTransition()
  const [searchValue, setSearchValue] = useState(search || "")
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [filters, setFilters] = useState<FilterState>({
    types: searchParams.get("types")?.split(",").filter(Boolean) || [],
    leadStatuses: searchParams.get("leadStatuses")?.split(",").filter(Boolean) || [],
    leadSources: searchParams.get("leadSources")?.split(",").filter(Boolean) || [],
    tags: searchParams.get("tags")?.split(",").filter(Boolean) || [],
    hasEmail: searchParams.get("hasEmail") === "true" ? true : undefined,
    hasPhone: searchParams.get("hasPhone") === "true" ? true : undefined,
    createdAfter: searchParams.get("createdAfter") || undefined,
    createdBefore: searchParams.get("createdBefore") || undefined,
  })

  const updateSearch = useCallback((value: string) => {
    startTransition(() => {
      const params = new URLSearchParams(searchParams.toString())
      if (value) params.set("search", value)
      else params.delete("search")
      params.delete("page")
      router.push(`/crm?${params.toString()}`)
    })
  }, [router, searchParams])

  const goToPage = useCallback((newPage: number) => {
    startTransition(() => {
      const params = new URLSearchParams(searchParams.toString())
      if (newPage > 1) params.set("page", newPage.toString())
      else params.delete("page")
      router.push(`/crm?${params.toString()}`)
    })
  }, [router, searchParams])

  const handleFiltersChange = useCallback((newFilters: FilterState) => {
    setFilters(newFilters)
    startTransition(() => {
      const params = new URLSearchParams(searchParams.toString())
      
      // Clear existing filter params
      params.delete("types")
      params.delete("leadStatuses")
      params.delete("leadSources")
      params.delete("tags")
      params.delete("hasEmail")
      params.delete("hasPhone")
      params.delete("createdAfter")
      params.delete("createdBefore")
      params.delete("page")

      // Set new filter params
      if (newFilters.types.length > 0) params.set("types", newFilters.types.join(","))
      if (newFilters.leadStatuses.length > 0) params.set("leadStatuses", newFilters.leadStatuses.join(","))
      if (newFilters.leadSources.length > 0) params.set("leadSources", newFilters.leadSources.join(","))
      if (newFilters.tags.length > 0) params.set("tags", newFilters.tags.join(","))
      if (newFilters.hasEmail) params.set("hasEmail", "true")
      if (newFilters.hasPhone) params.set("hasPhone", "true")
      if (newFilters.createdAfter) params.set("createdAfter", newFilters.createdAfter)
      if (newFilters.createdBefore) params.set("createdBefore", newFilters.createdBefore)

      router.push(`/crm?${params.toString()}`)
    })
  }, [router, searchParams])

  const handleClearFilters = useCallback(() => {
    const clearedFilters: FilterState = {
      types: [],
      leadStatuses: [],
      leadSources: [],
      tags: [],
      hasEmail: undefined,
      hasPhone: undefined,
      createdAfter: undefined,
      createdBefore: undefined,
    }
    setFilters(clearedFilters)
    startTransition(() => {
      const params = new URLSearchParams()
      if (search) params.set("search", search)
      router.push(`/crm?${params.toString()}`)
    })
  }, [router, search])

  const handleRemoveFilter = useCallback((key: keyof FilterState, value?: string) => {
    const newFilters: FilterState = { ...filters }
    if (value !== undefined && Array.isArray(newFilters[key])) {
      ;(newFilters[key] as string[]) = (newFilters[key] as string[]).filter((v: string) => v !== value)
    } else {
      ;(newFilters[key] as string[] | undefined) = key.startsWith("has") ? undefined : []
    }
    handleFiltersChange(newFilters)
  }, [filters, handleFiltersChange])

  const toggleSelectAll = () => {
    if (selectedIds.size === contacts.length) {
      setSelectedIds(new Set())
    } else {
      setSelectedIds(new Set(contacts.map((c) => c.id)))
    }
  }

  const toggleSelect = (id: string) => {
    const newSet = new Set(selectedIds)
    if (newSet.has(id)) {
      newSet.delete(id)
    } else {
      newSet.add(id)
    }
    setSelectedIds(newSet)
  }

  return (
    <>
      {/* Search & Filters */}
      <div className="flex flex-col gap-4">
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
              placeholder="Search contacts..."
              className="pl-10"
              value={searchValue}
              onChange={(e) => setSearchValue(e.target.value)}
            />
          </form>
          <AdvancedFilters
            filters={filters}
            onFiltersChange={handleFiltersChange}
            metadata={filterMetadata}
          />
        </div>

        {/* Active Filters Display */}
        <ActiveFiltersDisplay
          filters={filters}
          onRemove={handleRemoveFilter}
          onClear={handleClearFilters}
        />
      </div>

      {/* Bulk Actions Bar */}
      {selectedIds.size > 0 && (
        <div className="flex items-center gap-2 p-2 bg-muted rounded-lg">
          <Checkbox
            checked={selectedIds.size === contacts.length}
            onCheckedChange={toggleSelectAll}
          />
          <span className="text-sm font-medium">{selectedIds.size} selected</span>
          <Button variant="outline" size="sm" className="ml-auto">
            Add to Segment
          </Button>
          <Button variant="outline" size="sm">
            Add Tags
          </Button>
          <Button variant="outline" size="sm">
            Export
          </Button>
        </div>
      )}

      <Card className={isPending ? "opacity-50" : ""}>
        <CardContent className="p-0">
          {contacts.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12">
              <p className="text-muted-foreground">
                {search || Object.values(filters).some((f) => f && (Array.isArray(f) ? f.length > 0 : true))
                  ? `No contacts found matching your criteria`
                  : "No contacts yet"}
              </p>
              {(search || Object.values(filters).some((f) => f && (Array.isArray(f) ? f.length > 0 : true))) && (
                <Button
                  variant="link"
                  onClick={() => {
                    setSearchValue("")
                    handleClearFilters()
                  }}
                >
                  Clear all filters
                </Button>
              )}
            </div>
          ) : (
            <div className="divide-y">
              {contacts.map((contact) => (
                <div
                  key={contact.id}
                  className="flex items-center gap-4 p-4 hover:bg-accent/50 transition-colors"
                >
                  <Checkbox
                    checked={selectedIds.has(contact.id)}
                    onCheckedChange={() => toggleSelect(contact.id)}
                  />
                  <Link
                    href={`/crm/${contact.id}`}
                    className="flex items-center gap-4 flex-1 min-w-0"
                  >
                    <Avatar className="flex-shrink-0">
                      <AvatarFallback>
                        {getInitials(contact.firstName, contact.lastName)}
                      </AvatarFallback>
                    </Avatar>
                    <div className="min-w-0 flex-1">
                      <p className="font-medium truncate">
                        {contact.firstName} {contact.lastName}
                      </p>
                      <p className="text-sm text-muted-foreground truncate">{contact.email || "No email"}</p>
                    </div>
                  </Link>
                  <div className="flex items-center gap-4 flex-shrink-0">
                    <span className="hidden text-sm text-muted-foreground sm:block">
                      {contact.company || "—"}
                    </span>
                    <Badge
                      variant={
                        contact.type === "vip"
                          ? "default"
                          : contact.type === "customer"
                          ? "success"
                          : "secondary"
                      }
                    >
                      {contact.type}
                    </Badge>
                    {contact.leadScore !== null && contact.leadScore !== undefined && (
                      <div className="hidden items-center gap-1 sm:flex">
                        <span className="text-sm font-medium">{contact.leadScore}</span>
                        <span className="text-xs text-muted-foreground">score</span>
                      </div>
                    )}
                    <Button variant="ghost" size="icon-sm" asChild>
                      <Link href={`/crm/${contact.id}`}>
                        <MoreHorizontal className="h-4 w-4" />
                      </Link>
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            Showing {(page - 1) * 20 + 1} to {Math.min(page * 20, total)} of {total} contacts
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

function getInitials(firstName?: string | null, lastName?: string | null): string {
  const first = firstName?.[0] || ""
  const last = lastName?.[0] || ""
  return (first + last).toUpperCase() || "?"
}