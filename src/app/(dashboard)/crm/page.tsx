import Link from "next/link"
export const dynamic = "force-dynamic"

import { PageHeader } from "@/components/layout/page-header"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Plus, Users, UserPlus, LayoutGrid, List, Folders } from "lucide-react"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { getContacts, getContactStats, getLeadPipeline, getSegments, getContactFilterMetadata } from "@/lib/actions/contacts"
import { ContactList } from "./contact-list"
import { PipelineView } from "./pipeline-view"
import { SegmentsView } from "./segments-view"

export default async function CRMPage({
  searchParams,
}: {
  searchParams: Promise<{ search?: string; page?: string; view?: string }>
}) {
  const params = await searchParams
  const search = params.search
  const page = params.page ? parseInt(params.page) : 1

  const [{ contacts, total, totalPages }, stats, pipeline, segments, filterMetadata] = await Promise.all([
    getContacts({ search, page }),
    getContactStats(),
    getLeadPipeline(),
    getSegments(),
    getContactFilterMetadata(),
  ])

  // Calculate pipeline stats
  const pipelineStats = {
    total: Object.values(pipeline).flat().length,
    new: pipeline.new.length,
    contacted: pipeline.contacted.length,
    qualified: pipeline.qualified.length,
    converted: pipeline.converted.length,
  }

  return (
    <div className="space-y-8">
      <PageHeader
        heading="CRM"
        description="Manage your customers, leads, and segments"
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
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
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
            <div className="text-2xl font-bold text-primary">{stats.leads}</div>
            <p className="text-sm text-muted-foreground">Active Leads</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-green-500">{stats.customers}</div>
            <p className="text-sm text-muted-foreground">Customers</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold">{segments.length}</div>
            <p className="text-sm text-muted-foreground">Segments</p>
          </CardContent>
        </Card>
      </div>

      {/* Pipeline Quick Stats */}
      <div className="grid gap-2 sm:grid-cols-5">
        {[
          { label: "New", count: pipelineStats.new, color: "bg-slate-500" },
          { label: "Contacted", count: pipelineStats.contacted, color: "bg-blue-500" },
          { label: "Qualified", count: pipelineStats.qualified, color: "bg-purple-500" },
          { label: "Converted", count: pipelineStats.converted, color: "bg-green-500" },
          { label: "Total Leads", count: pipelineStats.total, color: "bg-primary" },
        ].map((stat) => (
          <div key={stat.label} className="flex items-center gap-2 p-2 rounded-lg bg-muted/50">
            <div className={`h-3 w-3 rounded-full ${stat.color}`} />
            <span className="text-sm font-medium">{stat.count}</span>
            <span className="text-xs text-muted-foreground">{stat.label}</span>
          </div>
        ))}
      </div>

      {/* Main Content with Tabs */}
      <Tabs defaultValue="list" className="space-y-6">
        <TabsList>
          <TabsTrigger value="list" className="gap-2">
            <List className="h-4 w-4" />
            All Contacts
          </TabsTrigger>
          <TabsTrigger value="pipeline" className="gap-2">
            <LayoutGrid className="h-4 w-4" />
            Pipeline
          </TabsTrigger>
          <TabsTrigger value="segments" className="gap-2">
            <Folders className="h-4 w-4" />
            Segments
          </TabsTrigger>
        </TabsList>

        <TabsContent value="list" className="space-y-6">
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
              filterMetadata={filterMetadata}
            />
          )}
        </TabsContent>

        <TabsContent value="pipeline">
          {pipelineStats.total === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-16">
                <LayoutGrid className="h-12 w-12 text-muted-foreground mb-4" />
                <h3 className="text-lg font-semibold">No leads in pipeline</h3>
                <p className="mt-1 text-sm text-muted-foreground text-center max-w-sm">
                  Add contacts as leads to start managing your sales pipeline.
                </p>
                <Link href="/crm/new" className="mt-6">
                  <Button>
                    <Plus className="h-4 w-4" />
                    Add Lead
                  </Button>
                </Link>
              </CardContent>
            </Card>
          ) : (
            <PipelineView initialPipeline={pipeline} />
          )}
        </TabsContent>

        <TabsContent value="segments">
          <SegmentsView initialSegments={segments} filterMetadata={filterMetadata} />
        </TabsContent>
      </Tabs>
    </div>
  )
}