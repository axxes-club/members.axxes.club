import Link from "next/link"
export const dynamic = "force-dynamic"

import { PageHeader } from "@/components/layout/page-header"
import { SectionHeader } from "@/components/layout/section-header"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Plus, Calendar, MapPin, Ticket, CalendarPlus } from "lucide-react"
import { getEvents, getEventStats } from "@/lib/actions/events"
import { format } from "date-fns"

export default async function EventsPage() {
  const [{ events: upcomingEvents }, { events: pastEvents }, stats] = await Promise.all([
    getEvents({ filter: "upcoming" }),
    getEvents({ filter: "past", limit: 6 }),
    getEventStats(),
  ])

  return (
    <div className="space-y-8">
      <PageHeader
        heading="Events"
        description="Create and manage your events"
        actions={
          <Link href="/events/new">
            <Button>
              <Plus className="h-4 w-4" />
              Create Event
            </Button>
          </Link>
        }
      />

      {/* Stats */}
      <div className="grid gap-4 sm:grid-cols-4">
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold">{stats.total}</div>
            <p className="text-sm text-muted-foreground">Total Events</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold">{stats.upcoming}</div>
            <p className="text-sm text-muted-foreground">Upcoming</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold">{stats.thisMonth}</div>
            <p className="text-sm text-muted-foreground">This Month</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold">{stats.totalAttendees}</div>
            <p className="text-sm text-muted-foreground">Total Attendees</p>
          </CardContent>
        </Card>
      </div>

      <SectionHeader
        number="01"
        title="Upcoming Events"
        description="Events scheduled for the future"
      />

      {upcomingEvents.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-muted">
              <CalendarPlus className="h-8 w-8 text-muted-foreground" />
            </div>
            <h3 className="mt-4 text-lg font-semibold">No upcoming events</h3>
            <p className="mt-1 text-sm text-muted-foreground text-center max-w-sm">
              Create your first event to start selling tickets and managing attendees.
            </p>
            <Link href="/events/new" className="mt-6">
              <Button>
                <Plus className="h-4 w-4" />
                Create Event
              </Button>
            </Link>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {upcomingEvents.map((event) => {
            const totalSold = event.ticketTypes.reduce((acc, t) => acc + (t.quantitySold || 0), 0)
            const totalCapacity = event.ticketTypes.reduce((acc, t) => acc + (t.quantityTotal || 0), 0)
            const soldPercentage = totalCapacity > 0 ? (totalSold / totalCapacity) * 100 : 0

            return (
              <Link key={event.id} href={`/events/${event.id}`}>
                <Card interactive>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <Badge
                        variant={
                          event.status === "published"
                            ? "success"
                            : event.status === "cancelled"
                            ? "destructive"
                            : "secondary"
                        }
                      >
                        {event.status}
                      </Badge>
                    </div>
                    <CardTitle className="mt-2">{event.name}</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="space-y-2 text-sm">
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <Calendar className="h-4 w-4" />
                        {format(new Date(event.startsAt), "MMM d, yyyy 'at' h:mm a")}
                      </div>
                      {event.venue && !Array.isArray(event.venue) && (
                        <div className="flex items-center gap-2 text-muted-foreground">
                          <MapPin className="h-4 w-4" />
                          {(event.venue as { name: string }).name}
                        </div>
                      )}
                    </div>

                    {totalCapacity > 0 && (
                      <div className="flex items-center justify-between border-t pt-4">
                        <div className="flex items-center gap-2 text-sm">
                          <Ticket className="h-4 w-4 text-muted-foreground" />
                          <span>
                            {totalSold} / {totalCapacity}
                          </span>
                        </div>
                        <div className="h-2 w-24 overflow-hidden rounded-full bg-muted">
                          <div
                            className="h-full bg-primary"
                            style={{ width: `${Math.min(soldPercentage, 100)}%` }}
                          />
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </Link>
            )
          })}
        </div>
      )}

      <SectionHeader
        number="02"
        title="Past Events"
        description="Completed events and their performance"
      />

      {pastEvents.length === 0 ? (
        <Card>
          <CardContent className="p-6 text-center text-muted-foreground">
            No past events to display
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {pastEvents.map((event) => {
            const totalSold = event.ticketTypes.reduce((acc, t) => acc + (t.quantitySold || 0), 0)

            return (
              <Link key={event.id} href={`/events/${event.id}`}>
                <Card interactive className="opacity-75 hover:opacity-100">
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <Badge variant="outline">{event.status}</Badge>
                    </div>
                    <CardTitle className="mt-2">{event.name}</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="space-y-2 text-sm">
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <Calendar className="h-4 w-4" />
                        {format(new Date(event.startsAt), "MMM d, yyyy")}
                      </div>
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <Ticket className="h-4 w-4" />
                        {totalSold} tickets sold
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            )
          })}
        </div>
      )}
    </div>
  )
}
