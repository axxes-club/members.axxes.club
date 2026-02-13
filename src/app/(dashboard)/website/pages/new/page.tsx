import { PageHeader } from "@/components/layout/page-header"
import { NewPageForm } from "./new-page-form"

export default function NewPagePage() {
  return (
    <div className="space-y-8">
      <PageHeader
        heading="Create New Page"
        description="Set up a new page for your website"
      />
      <NewPageForm />
    </div>
  )
}
