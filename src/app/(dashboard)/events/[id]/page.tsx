import Link from "next/link"
import { notFound } from "next/navigation"
import { PageHeader } from "@/components/layout/page-header"
import { SectionHeader } from "@/components/layout/section-header"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { ArrowLeft, Calendar, MapPin, Clock, Users, Ticket, Pencil, ExternalLink } from "lucide-react"
import { getEvent } from "@/lib/actions/events"
import { format } from "date-fns"
import { EventActions } from "./event-actions"

export default async function EventDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params

  let event
  try {
    event = await getEvent(id)
  } catch {
    notFound()
  }

  const totalSold = event.ticketTypes.reduce((acc, t) => acc + (t.quantitySold || 0), 0)
  const totalCapacity = event.ticketTypes.reduce((acc, t) => acc + (t.quantityTotal || 0), 0)

  return (
    <div className="space-y-8">
      <PageHeader
        heading={event.name}
        description={event.shortDescription || "Event details"}
        actions={
          <div className="flex gap-2">
            <Link href="/events">
              <Button variant="outline">
                <ArrowLeft className="h-4 w-4" />
                Back
              </Button>
            </Link>
            <Link href={`/events/${id}/edit`}>
              <Button>
                <Pencil className="h-4 w-4" />
                Edit
              </Button>
            </Link>
          </div>
        }
      />

      <div className="grid gap-8 lg:grid-cols-3">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          <SectionHeader number="01" title="Event Information" />

          <Card>
            <CardContent className="p-6 space-y-6">
              <div className="flex items-center gap-3">
                <Badge
                  variant={
                    event.status === "published"
                      ? "success"
                      : event.status === "cancelled"
                      ? "destructive"
                      : "secondary"
                  }
                  className="text-sm"
                >
                  {event.status}
                </Badge>
                {event.isFeatured && <Badge variant="outline">Featured</Badge>}
                {event.isPrivate && <Badge variant="outline">Private</Badge>}
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-muted">
                    <Calendar className="h-5 w-5 text-muted-foreground" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Date</p>
                    <p className="font-medium">
                      {format(new Date(event.startsAt), "EEEE, MMMM d, yyyy")}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-muted">
                    <Clock className="h-5 w-5 text-muted-foreground" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Time</p>
                    <p className="font-medium">
                      {format(new Date(event.startsAt), "h:mm a")}
                      {event.endsAt && ` - ${format(new Date(event.endsAt), "h:mm a")}`}
                    </p>
                  </div>
                </div>

                {event.venue && (
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-muted">
                      <MapPin className="h-5 w-5 text-muted-foreground" />
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Venue</p>
                      <p className="font-medium">{event.venue.name}</p>
                      {event.venue.city && (
                        <p className="text-sm text-muted-foreground">
                          {[event.venue.city, event.venue.state].filter(Boolean).join(", ")}
                        </p>
                      )}
                    </div>
                  </div>
                )}

                {event.doorsOpenAt && (
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-muted">
                      <Users className="h-5 w-5 text-muted-foreground" />
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Doors Open</p>
                      <p className="font-medium">
                        {format(new Date(event.doorsOpenAt), "h:mm a")}
                      </p>
                    </div>
                  </div>
                )}
              </div>

              {event.description && (
                <div className="border-t pt-6">
                  <h3 className="font-medium mb-2">Description</h3>
                  <p className="whitespace-pre-wrap text-sm text-muted-foreground">
                    {event.description}
                  </p>
                </div>
              )}
            </CardContent>
          </Card>

          <SectionHeader number="02" title="Ticket Types" />

          {event.ticketTypes.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12">
                <Ticket className="h-8 w-8 text-muted-foreground" />
                <p className="mt-2 text-sm text-muted-foreground">No ticket types created yet</p>
                <Button variant="link" className="mt-2">
                  Add ticket type
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              {event.ticketTypes.map((ticket) => {
                const available = (ticket.quantityTotal || 0) - (ticket.quantitySold || 0) - (ticket.quantityReserved || 0)
                return (
                  <Card key={ticket.id}>
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <h4 className="font-medium">{ticket.name}</h4>
                          {ticket.description && (
                            <p className="text-sm text-muted-foreground">{ticket.description}</p>
                          )}
                        </div>
                        <div className="text-right">
                          <p className="text-lg font-bold">
                            ${Number(ticket.price).toFixed(2)}
                          </p>
                          <p className="text-sm text-muted-foreground">
                            {available} available
                          </p>
                        </div>
                      </div>
                      <div className="mt-4 flex items-center justify-between text-sm">
                        <Badge variant={ticket.status === "available" ? "success" : "secondary"}>
                          {ticket.status}
                        </Badge>
                        <span className="text-muted-foreground">
                          {ticket.quantitySold || 0} / {ticket.quantityTotal || 0} sold
                        </span>
                      </div>
                    </CardContent>
                  </Card>
                )
              })}
            </div>
          )}

          <SectionHeader number="03" title={`Attendees (${event.attendees.length})`} />

          {event.attendees.length === 0 ? (
            <Card>
              <CardContent className="p-6 text-center text-muted-foreground">
                No attendees registered yet
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardContent className="p-0">
                <div className="divide-y">
                  {event.attendees.slice(0, 10).map((attendee) => (
                    <div key={attendee.id} className="flex items-center justify-between p-4">
                      <div>
                        <p className="font-medium">
                          {attendee.firstName} {attendee.lastName}
                        </p>
                        <p className="text-sm text-muted-foreground">{attendee.email}</p>
                      </div>
                      <Badge
                        variant={
                          attendee.status === "checked_in"
                            ? "success"
                            : attendee.status === "cancelled"
                            ? "destructive"
                            : "secondary"
                        }
                      >
                        {attendee.status.replace("_", " ")}
                      </Badge>
                    </div>
                  ))}
                </div>
                {event.attendees.length > 10 && (
                  <div className="border-t p-4 text-center">
                    <Button variant="link">View all {event.attendees.length} attendees</Button>
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Ticket Sales</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="text-center">
                <p className="text-4xl font-bold">{totalSold}</p>
                <p className="text-sm text-muted-foreground">
                  of {totalCapacity || "unlimited"} tickets sold
                </p>
              </div>
              {totalCapacity > 0 && (
                <div className="h-2 overflow-hidden rounded-full bg-muted">
                  <div
                    className="h-full bg-primary"
                    style={{ width: `${Math.min((totalSold / totalCapacity) * 100, 100)}%` }}
                  />
                </div>
              )}
            </CardContent>
          </Card>

          {event.externalPlatform && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">External Integration</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Platform</span>
                  <span className="font-medium">{event.externalPlatform}</span>
                </div>
                {event.externalUrl && (
                  <a
                    href={event.externalUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 text-sm text-primary hover:underline"
                  >
                    <ExternalLink className="h-4 w-4" />
                    View on {event.externalPlatform}
                  </a>
                )}
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Sync</span>
                  <Badge variant={event.syncEnabled ? "success" : "secondary"}>
                    {event.syncEnabled ? "Enabled" : "Disabled"}
                  </Badge>
                </div>
              </CardContent>
            </Card>
          )}

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Category</span>
                <span className="font-medium">{event.category || "—"}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Minimum Age</span>
                <span className="font-medium">
                  {event.minimumAge ? `${event.minimumAge}+` : "All ages"}
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Created</span>
                <span className="font-medium">
                  {format(new Date(event.createdAt), "MMM d, yyyy")}
                </span>
              </div>
            </CardContent>
          </Card>

          <EventActions eventId={id} status={event.status} />
        </div>
      </div>
    </div>
  )
}
