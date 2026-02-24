import { notFound } from "next/navigation"
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

  return <PuckEditorClient pageId={pageId} />
}