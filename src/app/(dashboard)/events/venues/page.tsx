import Link from "next/link"
export const dynamic = "force-dynamic"

import { PageHeader } from "@/components/layout/page-header"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Plus, MapPin, Users, Building2 } from "lucide-react"
import { getVenues, getVenueStats } from "@/lib/actions/events"

export default async function VenuesPage() {
  const [{ venues }, stats] = await Promise.all([
    getVenues(),
    getVenueStats(),
  ])

  return (
    <div className="space-y-8">
      <PageHeader
        heading="Venues"
        description="Manage your event locations"
        actions={
          <Link href="/events/venues/new">
            <Button>
              <Plus className="h-4 w-4" />
              Add Venue
            </Button>
          </Link>
        }
      />

      {/* Stats */}
      <div className="grid gap-4 sm:grid-cols-3">
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold">{stats.total}</div>
            <p className="text-sm text-muted-foreground">Total Venues</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold">{stats.withEvents}</div>
            <p className="text-sm text-muted-foreground">With Events</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold">{stats.totalCapacity.toLocaleString()}</div>
            <p className="text-sm text-muted-foreground">Total Capacity</p>
          </CardContent>
        </Card>
      </div>

      {venues.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-muted">
              <Building2 className="h-8 w-8 text-muted-foreground" />
            </div>
            <h3 className="mt-4 text-lg font-semibold">No venues yet</h3>
            <p className="mt-1 text-sm text-muted-foreground text-center max-w-sm">
              Add your first venue to start assigning locations to your events.
            </p>
            <Link href="/events/venues/new" className="mt-6">
              <Button>
                <Plus className="h-4 w-4" />
                Add Venue
              </Button>
            </Link>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {venues.map((venue) => (
            <Link key={venue.id} href={`/events/venues/${venue.id}`}>
              <Card interactive>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <MapPin className="h-4 w-4 text-muted-foreground" />
                    {venue.name}
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {(venue.city || venue.state) && (
                    <p className="text-sm text-muted-foreground">
                      {[venue.city, venue.state].filter(Boolean).join(", ")}
                    </p>
                  )}
                  {venue.capacity && (
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Users className="h-4 w-4" />
                      Capacity: {venue.capacity.toLocaleString()}
                    </div>
                  )}
                  {venue.addressLine1 && (
                    <p className="text-sm text-muted-foreground truncate">
                      {venue.addressLine1}
                    </p>
                  )}
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
