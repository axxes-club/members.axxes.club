import { notFound, redirect } from "next/navigation"
import { getAuthContext } from "@/lib/auth"
import { structuredEditorPath } from "@/lib/website/structured"
import { PuckEditorClient } from "../puck-editor-client"

interface PuckEditorPageProps {
  params: Promise<{
    pageId: string
  }>
}

export default async function PuckEditorPage({ params }: PuckEditorPageProps) {
  const { pageId } = await params

  if (!pageId) {
    notFound()
  }

  const { tenantId } = await getAuthContext()
  const structured = await structuredEditorPath(tenantId, pageId)
  if (structured) redirect(structured)

  return <PuckEditorClient pageId={pageId} />
}