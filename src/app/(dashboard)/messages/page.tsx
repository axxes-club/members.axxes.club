import { PageHeader } from "@/components/layout/page-header"
export const dynamic = "force-dynamic"

import { SectionHeader } from "@/components/layout/section-header"
import { Card, CardContent } from "@/components/ui/card"
import { MessageSquare } from "lucide-react"
import { getConversations } from "@/lib/actions/messaging"
import { ConversationList } from "./conversation-list"
import { NewConversationDialog } from "./new-conversation-dialog"

export default async function MessagesPage() {
  const conversations = await getConversations()

  return (
    <div className="space-y-8">
      <PageHeader
        heading="Messages"
        description="Chat with your team members"
        actions={<NewConversationDialog />}
      />

      <SectionHeader
        number="01"
        title="Conversations"
        description="Your recent conversations"
      />

      {conversations.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-muted">
              <MessageSquare className="h-8 w-8 text-muted-foreground" />
            </div>
            <h3 className="mt-4 text-lg font-semibold">No conversations yet</h3>
            <p className="mt-1 text-sm text-muted-foreground text-center max-w-sm">
              Start a conversation with your team members to collaborate.
            </p>
            <div className="mt-6">
              <NewConversationDialog />
            </div>
          </CardContent>
        </Card>
      ) : (
        <ConversationList initialConversations={conversations} />
      )}
    </div>
  )
}
