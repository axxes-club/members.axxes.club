import { notFound } from "next/navigation"
import { PageHeader } from "@/components/layout/page-header"
import { getPost, getSocialAccounts } from "@/lib/actions/social"
import { PostDetailView } from "./post-detail-view"

interface PostPageProps {
  params: Promise<{ postId: string }>
}

export default async function PostPage({ params }: PostPageProps) {
  const { postId } = await params

  try {
    const [post, accounts] = await Promise.all([
      getPost(postId),
      getSocialAccounts(),
    ])

    return (
      <div className="space-y-8">
        <PageHeader
          heading="Edit Post"
          description="Modify your social media post"
        />
        <PostDetailView post={post} accounts={accounts} />
      </div>
    )
  } catch {
    notFound()
  }
}
