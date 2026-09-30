import { redirect } from "next/navigation"

export default async function DocumentPage({ params }: { params: Promise<{ id: string; documentId: string }> }) {
  const { id, documentId } = await params
  redirect(`https://matters.axxes.club/matters/${encodeURIComponent(id)}/documents/${encodeURIComponent(documentId)}`)
}
