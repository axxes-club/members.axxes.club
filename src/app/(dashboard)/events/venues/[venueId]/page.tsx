import { notFound } from "next/navigation"
import { PageHeader } from "@/components/layout/page-header"
import { getVenue } from "@/lib/actions/events"
import { VenueDetailView } from "./venue-detail-view"

interface VenuePageProps {
  params: Promise<{ venueId: string }>
}

export default async function VenuePage({ params }: VenuePageProps) {
  const { venueId } = await params

  const venue = await getVenue(venueId).catch(() => null)
  
  if (!venue) {
    notFound()
  }

  return (
    <div className="space-y-8">
      <PageHeader
        heading={venue.name}
        description="View and manage venue details"
      />
      <VenueDetailView venue={venue} />
    </div>
  )
}
