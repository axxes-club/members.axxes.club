import { notFound } from "next/navigation"
export const dynamic = "force-dynamic"

import { PageHeader } from "@/components/layout/page-header"
import { getPost, getSocialAccounts } from "@/lib/actions/social"
import { PostDetailView } from "./post-detail-view"

interface PostPageProps {
  params: Promise<{ postId: string }>
}

export default async function PostPage({ params }: PostPageProps) {
  const { postId } = await params

  const [post, accounts] = await Promise.all([
    getPost(postId).catch(() => null),
    getSocialAccounts().catch(() => []),
  ])

  if (!post) {
    notFound()
  }

  return (
    <div className="space-y-8">
      <PageHeader
        heading="Edit Post"
        description="Modify your social media post"
      />
      <PostDetailView post={post as any} accounts={accounts as any} />
    </div>
  )
}
