import Link from "next/link"
export const dynamic = "force-dynamic"

import { PageHeader } from "@/components/layout/page-header"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Plus, Building2 } from "lucide-react"
import { getLocations, getLocationStats } from "@/lib/actions/inventory-locations"
import { LocationList } from "./location-list"
import { LocationStats } from "./location-stats"

export default async function LocationsPage({
  searchParams,
}: {
  searchParams: Promise<{ search?: string; page?: string }>
}) {
  const params = await searchParams
  const search = params.search
  const page = params.page ? parseInt(params.page) : 1

  const [{ locations, total, totalPages }, stats] = await Promise.all([
    getLocations({ search, page }),
    getLocationStats(),
  ])

  return (
    <div className="space-y-8">
      <PageHeader
        heading="Locations"
        description="Manage warehouses, stores, and storage locations"
        actions={
          <Link href="/inventory/locations/new">
            <Button>
              <Plus className="h-4 w-4" />
              Add Location
            </Button>
          </Link>
        }
      />

      {/* Stats */}
      <LocationStats stats={stats} />

      {locations.length === 0 && !search ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-muted">
              <Building2 className="h-8 w-8 text-muted-foreground" />
            </div>
            <h3 className="mt-4 text-lg font-semibold">No locations yet</h3>
            <p className="mt-1 text-sm text-muted-foreground text-center max-w-sm">
              Add your first location to start tracking inventory across warehouses, stores, or storage areas.
            </p>
            <Link href="/inventory/locations/new" className="mt-6">
              <Button>
                <Plus className="h-4 w-4" />
                Add Location
              </Button>
            </Link>
          </CardContent>
        </Card>
      ) : (
        <LocationList
          locations={locations}
          total={total}
          page={page}
          totalPages={totalPages}
          search={search}
        />
      )}
    </div>
  )
}