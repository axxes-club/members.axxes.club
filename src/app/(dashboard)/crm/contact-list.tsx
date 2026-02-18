"use client"

import { useRouter } from "next/navigation"
import Link from "next/link"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Search, Filter, MoreHorizontal, ChevronLeft, ChevronRight } from "lucide-react"
import { useCallback, useState, useTransition } from "react"
import type { Contact } from "@/lib/db/schema"

interface ContactListProps {
  contacts: Contact[]
  total: number
  page: number
  totalPages: number
  search?: string
}

export function ContactList({ contacts, total, page, totalPages, search }: ContactListProps) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [searchValue, setSearchValue] = useState(search || "")

  const updateSearch = useCallback((value: string) => {
    startTransition(() => {
      const params = new URLSearchParams()
      if (value) params.set("search", value)
      router.push(`/crm?${params.toString()}`)
    })
  }, [router])

  const goToPage = useCallback((newPage: number) => {
    startTransition(() => {
      const params = new URLSearchParams()
      if (search) params.set("search", search)
      if (newPage > 1) params.set("page", newPage.toString())
      router.push(`/crm?${params.toString()}`)
    })
  }, [router, search])

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
            placeholder="Search contacts..."
            className="pl-10"
            value={searchValue}
            onChange={(e) => setSearchValue(e.target.value)}
          />
        </form>
        <Button variant="outline">
          <Filter className="h-4 w-4" />
          Filters
        </Button>
      </div>

      <Card className={isPending ? "opacity-50" : ""}>
        <CardContent className="p-0">
          {contacts.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12">
              <p className="text-muted-foreground">No contacts found matching &quot;{search}&quot;</p>
              <Button
                variant="link"
                onClick={() => {
                  setSearchValue("")
                  updateSearch("")
                }}
              >
                Clear search
              </Button>
            </div>
          ) : (
            <div className="divide-y">
              {contacts.map((contact) => (
                <Link
                  key={contact.id}
                  href={`/crm/${contact.id}`}
                  className="flex items-center justify-between p-4 hover:bg-accent/50 transition-colors"
                >
                  <div className="flex items-center gap-4">
                    <Avatar>
                      <AvatarFallback>
                        {getInitials(contact.firstName, contact.lastName)}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="font-medium">
                        {contact.firstName} {contact.lastName}
                      </p>
                      <p className="text-sm text-muted-foreground">{contact.email || "No email"}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
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
                    <Button variant="ghost" size="icon-sm" onClick={(e) => e.preventDefault()}>
                      <MoreHorizontal className="h-4 w-4" />
                    </Button>
                  </div>
                </Link>
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
