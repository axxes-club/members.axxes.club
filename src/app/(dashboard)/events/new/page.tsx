"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { PageHeader } from "@/components/layout/page-header"
import { SectionHeader } from "@/components/layout/section-header"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { ArrowLeft } from "lucide-react"
import { createEvent, getVenues } from "@/lib/actions/events"
import type { Venue } from "@/lib/db/schema"

export default function NewEventPage() {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [venues, setVenues] = useState<Venue[]>([])

  useEffect(() => {
    async function loadVenues() {
      try {
        const { venues: venueList } = await getVenues()
        setVenues(venueList)
      } catch {
        // Ignore errors, venues are optional
      }
    }
    loadVenues()
  }, [])

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setIsLoading(true)
    setError(null)

    const formData = new FormData(e.currentTarget)
    const data = {
      name: formData.get("name") as string,
      description: formData.get("description") as string,
      startsAt: formData.get("startsAt") as string,
      endsAt: formData.get("endsAt") as string,
      doorsOpenAt: formData.get("doorsOpenAt") as string,
      venueId: formData.get("venueId") as string,
      category: formData.get("category") as string,
      minimumAge: formData.get("minimumAge") ? parseInt(formData.get("minimumAge") as string) : undefined,
    }

    try {
      const event = await createEvent(data)
      router.push(`/events/${event.id}`)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create event")
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="space-y-8">
      <PageHeader
        heading="Create Event"
        description="Set up a new event"
        actions={
          <Link href="/events">
            <Button variant="outline">
              <ArrowLeft className="h-4 w-4" />
              Back
            </Button>
          </Link>
        }
      />

      <form onSubmit={handleSubmit}>
        <SectionHeader number="01" title="Event Details" />

        <Card className="mt-4">
          <CardContent className="p-6 space-y-6">
            {error && (
              <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
                {error}
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="name">Event Name *</Label>
              <Input id="name" name="name" placeholder="Summer Music Festival" required />
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <textarea
                id="description"
                name="description"
                rows={4}
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                placeholder="Tell people about your event..."
              />
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="category">Category</Label>
                <select
                  id="category"
                  name="category"
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                >
                  <option value="">Select a category</option>
                  <option value="music">Music</option>
                  <option value="nightlife">Nightlife</option>
                  <option value="conference">Conference</option>
                  <option value="workshop">Workshop</option>
                  <option value="networking">Networking</option>
                  <option value="art">Art & Culture</option>
                  <option value="sports">Sports</option>
                  <option value="other">Other</option>
                </select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="minimumAge">Minimum Age</Label>
                <Input
                  id="minimumAge"
                  name="minimumAge"
                  type="number"
                  min="0"
                  placeholder="e.g., 21"
                />
              </div>
            </div>
          </CardContent>
        </Card>

        <SectionHeader number="02" title="Date & Time" className="mt-8" />

        <Card className="mt-4">
          <CardContent className="p-6 space-y-6">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="startsAt">Start Date & Time *</Label>
                <Input id="startsAt" name="startsAt" type="datetime-local" required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="endsAt">End Date & Time</Label>
                <Input id="endsAt" name="endsAt" type="datetime-local" />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="doorsOpenAt">Doors Open</Label>
              <Input id="doorsOpenAt" name="doorsOpenAt" type="datetime-local" />
            </div>
          </CardContent>
        </Card>

        <SectionHeader number="03" title="Venue" className="mt-8" />

        <Card className="mt-4">
          <CardContent className="p-6 space-y-6">
            <div className="space-y-2">
              <Label htmlFor="venueId">Select Venue</Label>
              <select
                id="venueId"
                name="venueId"
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              >
                <option value="">No venue selected</option>
                {venues.map((venue) => (
                  <option key={venue.id} value={venue.id}>
                    {venue.name} {venue.city ? `- ${venue.city}` : ""}
                  </option>
                ))}
              </select>
            </div>
            <p className="text-sm text-muted-foreground">
              You can manage venues in{" "}
              <Link href="/settings" className="underline">
                Settings
              </Link>
            </p>
          </CardContent>
        </Card>

        <div className="mt-8 flex justify-end gap-4">
          <Link href="/events">
            <Button type="button" variant="outline">
              Cancel
            </Button>
          </Link>
          <Button type="submit" disabled={isLoading}>
            {isLoading ? "Creating..." : "Create Event"}
          </Button>
        </div>
      </form>
    </div>
  )
}
