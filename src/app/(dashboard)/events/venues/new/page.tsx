import { PageHeader } from "@/components/layout/page-header"
export const dynamic = "force-dynamic"

import { NewVenueForm } from "./new-venue-form"

export default function NewVenuePage() {
  return (
    <div className="space-y-8">
      <PageHeader
        heading="Add Venue"
        description="Create a new venue for your events"
      />
      <div className="max-w-2xl">
        <NewVenueForm />
      </div>
    </div>
  )
}
