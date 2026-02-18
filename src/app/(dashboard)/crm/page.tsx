import Link from "next/link"
import { PageHeader } from "@/components/layout/page-header"
import { SectionHeader } from "@/components/layout/section-header"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Plus, Users, UserPlus } from "lucide-react"
import { Input } from "@/components/ui/input"
import { getContacts, getContactStats } from "@/lib/actions/contacts"
import { ContactList } from "./contact-list"

export default async function CRMPage({
  searchParams,
}: {
  searchParams: Promise<{ search?: string; page?: string }>
}) {
  const params = await searchParams
  const search = params.search
  const page = params.page ? parseInt(params.page) : 1

  const [{ contacts, total, totalPages }, stats] = await Promise.all([
    getContacts({ search, page }),
    getContactStats(),
  ])

  return (
    <div className="space-y-8">
      <PageHeader
        heading="Contacts"
        description="Manage your customers and leads"
        actions={
          <Link href="/crm/new">
            <Button>
              <Plus className="h-4 w-4" />
              Add Contact
            </Button>
          </Link>
        }
      />

      {/* Stats */}
      <div className="grid gap-4 sm:grid-cols-4">
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold">{stats.total}</div>
            <p className="text-sm text-muted-foreground">Total Contacts</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold">{stats.thisMonth}</div>
            <p className="text-sm text-muted-foreground">Added This Month</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold">{stats.leads}</div>
            <p className="text-sm text-muted-foreground">Active Leads</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold">{stats.customers}</div>
            <p className="text-sm text-muted-foreground">Customers</p>
          </CardContent>
        </Card>
      </div>

      <SectionHeader number="01" title="All Contacts" description="View and manage your contact database" />

      {contacts.length === 0 && !search ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-muted">
              <Users className="h-8 w-8 text-muted-foreground" />
            </div>
            <h3 className="mt-4 text-lg font-semibold">No contacts yet</h3>
            <p className="mt-1 text-sm text-muted-foreground text-center max-w-sm">
              Get started by adding your first contact. You can import contacts or add them manually.
            </p>
            <div className="mt-6 flex gap-3">
              <Link href="/crm/new">
                <Button>
                  <UserPlus className="h-4 w-4" />
                  Add Contact
                </Button>
              </Link>
              <Button variant="outline">Import Contacts</Button>
            </div>
          </CardContent>
        </Card>
      ) : (
        <ContactList
          contacts={contacts}
          total={total}
          page={page}
          totalPages={totalPages}
          search={search}
        />
      )}
    </div>
  )
}
