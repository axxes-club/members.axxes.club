import { redirect } from "next/navigation"

export default async function MatterPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  redirect(`https://matters.axxes.club/matters/${encodeURIComponent(id)}`)
}
