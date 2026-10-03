import { notFound, redirect } from "next/navigation"
export const dynamic = "force-dynamic"

import { getPage } from "@/lib/actions/pages"
import { getBrandProfile } from "@/lib/actions/brand"
import { extractBrandProfileForEditor } from "@/lib/brand/brand-styles"
import { PageEditor } from "./page-editor"
import { getAuthContext } from "@/lib/auth"
import { structuredEditorPath } from "@/lib/website/structured"

interface PageEditorPageProps {
  params: Promise<{ pageId: string }>
}

export default async function PageEditorPage({ params }: PageEditorPageProps) {
  const { pageId } = await params
  const { tenantId } = await getAuthContext()
  const structured = await structuredEditorPath(tenantId, pageId)
  if (structured) redirect(structured)

  const [page, brandProfile] = await Promise.all([
    getPage(pageId).catch(() => null),
    getBrandProfile().catch(() => null),
  ])

  if (!page) {
    notFound()
  }

  const brandForEditor = extractBrandProfileForEditor(brandProfile ?? null)
  return <PageEditor page={page} brandProfile={brandForEditor} />
}
