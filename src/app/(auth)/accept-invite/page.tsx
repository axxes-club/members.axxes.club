import { Suspense } from "react"
import { AcceptInviteContent } from "./accept-invite-content"

// Force dynamic rendering to prevent prerendering issues with client-side hooks
export const dynamic = "force-dynamic"

export default function AcceptInvitePage() {
  return (
    <Suspense fallback={<AcceptInviteLoading />}>
      <AcceptInviteContent />
    </Suspense>
  )
}

function AcceptInviteLoading() {
  return (
    <div className="flex min-h-screen items-center justify-center">
      <div className="text-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-club border-t-transparent mx-auto" />
        <p className="mt-4 text-muted-foreground">Loading invitation...</p>
      </div>
    </div>
  )
}
