import { notFound } from "next/navigation"
import { getPage } from "@/lib/actions/pages"
import { PageEditor } from "./page-editor"

interface PageEditorPageProps {
  params: Promise<{ pageId: string }>
}

export default async function PageEditorPage({ params }: PageEditorPageProps) {
  const { pageId } = await params

  try {
    const page = await getPage(pageId)
    return <PageEditor page={page} />
  } catch {
    notFound()
  }
}
