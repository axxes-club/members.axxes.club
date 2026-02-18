import { notFound } from "next/navigation"
import { getPage } from "@/lib/actions/pages"
import { getBrandProfile } from "@/lib/actions/brand"
import { extractBrandProfileForEditor } from "@/lib/brand/brand-styles"
import { PageEditor } from "./page-editor"

interface PageEditorPageProps {
  params: Promise<{ pageId: string }>
}

export default async function PageEditorPage({ params }: PageEditorPageProps) {
  const { pageId } = await params

  try {
    const [page, brandProfile] = await Promise.all([
      getPage(pageId),
      getBrandProfile(),
    ])
    const brandForEditor = extractBrandProfileForEditor(brandProfile ?? null)
    return <PageEditor page={page} brandProfile={brandForEditor} />
  } catch {
    notFound()
  }
}
