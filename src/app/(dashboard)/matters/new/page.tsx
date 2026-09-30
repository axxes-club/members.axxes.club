import { PageHeader } from "@/components/layout/page-header"
import { getMatterTemplates } from "@/lib/actions/matters"
import { MatterForm } from "./matter-form"

export const dynamic = "force-dynamic"

export default async function NewMatterPage() {
  const templates = await getMatterTemplates()

  return (
    <div className="mx-auto max-w-3xl space-y-8">
      <PageHeader
        heading="Start a matter"
        description="One case. The documents, the dates, the people, and who has seen what."
      />
      <MatterForm templates={templates} />
    </div>
  )
}
