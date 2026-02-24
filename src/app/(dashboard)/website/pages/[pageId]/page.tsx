import { notFound } from "next/navigation"
export const dynamic = "force-dynamic"

import { getPage } from "@/lib/actions/pages"
import { getBrandProfile } from "@/lib/actions/brand"
import { extractBrandProfileForEditor } from "@/lib/brand/brand-styles"
import { PageEditor } from "./page-editor"

interface PageEditorPageProps {
  params: Promise<{ pageId: string }>
}

export default async function PageEditorPage({ params }: PageEditorPageProps) {
  const { pageId } = await params

  const [page, brandProfile] = await Promise.all([
    getPage(pageId).catch(() => null),
    getBrandProfile().catch(() => null),
  ])

  if (!page) {
    notFound()
  }

  const brandForEditor = extractBrandProfileForEditor(brandProfile ?? null)
  return <PageEditor page={page as any} brandProfile={brandForEditor} />
}
