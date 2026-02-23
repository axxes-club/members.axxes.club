import { PageHeader } from "@/components/layout/page-header"
export const dynamic = "force-dynamic"

import { getSocialAccounts } from "@/lib/actions/social"
import { NewPostForm } from "./new-post-form"

export default async function NewPostPage() {
  const accounts = await getSocialAccounts()

  return (
    <div className="space-y-8">
      <PageHeader
        heading="Create Post"
        description="Compose a new social media post"
      />
      <div className="max-w-2xl">
        <NewPostForm accounts={accounts} />
      </div>
    </div>
  )
}
