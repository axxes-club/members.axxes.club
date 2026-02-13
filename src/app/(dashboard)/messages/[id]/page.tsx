import { notFound } from "next/navigation"
import { getConversation } from "@/lib/actions/messaging"
import { ConversationView } from "./conversation-view"

interface ConversationPageProps {
  params: Promise<{ id: string }>
}

export default async function ConversationPage({ params }: ConversationPageProps) {
  const { id } = await params

  try {
    const conversation = await getConversation(id)
    return <ConversationView conversation={conversation} />
  } catch {
    notFound()
  }
}
