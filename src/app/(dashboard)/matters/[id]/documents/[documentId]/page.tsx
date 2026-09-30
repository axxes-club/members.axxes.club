import Link from "next/link"
import { notFound } from "next/navigation"
import { format } from "date-fns"
export const dynamic = "force-dynamic"

import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"
import { ArrowLeft, FileText } from "lucide-react"
import { getAuthContext } from "@/lib/auth"
import { db } from "@/lib/db"
import { matterParticipants } from "@/lib/db/schema"
import { and, eq } from "drizzle-orm"
import { getDocumentAcks } from "@/lib/actions/matters"
import { DECISION_LABEL, DECIDING_ROLES } from "@/lib/matters"
import { AckButton, BumpRevisionButton } from "../../ack-button"

const VARIANT: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
  approved: "default",
  viewed: "outline",
  changes_requested: "secondary",
  rejected: "destructive",
}

/**
 * One document, and everything anybody has ever said about it.
 *
 * The ordering below is the product. The full ledger runs newest-first and is
 * NOT collapsed to "current status", because the sequence is the information:
 * a reader can see that Rosa approved v1, then objected to v2, then approved v3,
 * and that this document is now at v4 which nobody has opened. A status column
 * would flatten exactly the thing that matters.
 */
export default async function DocumentPage({
  params,
}: {
  params: Promise<{ id: string; documentId: string }>
}) {
  const { id, documentId } = await params
  const { userId } = await getAuthContext()
  const result = await getDocumentAcks(documentId)
  if (!result) notFound()

  const { document, acks } = result
  const currentRevision = document.revision

  // Latest decision per person, for the "who has not seen this" line only.
  const latest = new Map<string, (typeof acks)[number]>()
  for (const a of [...acks].reverse()) latest.set(a.actorKey, a)
  const seenCurrent = [...latest.values()].filter((a) => a.revision === currentRevision)

  // Does the signed-in person hold a role that can actually decide? An observer
  // can read the whole record and record nothing, and the button says so rather
  // than letting them press it and fail.
  const [me] = await db
    .select({ role: matterParticipants.role })
    .from(matterParticipants)
    .where(
      and(
        eq(matterParticipants.matterId, document.matterId),
        eq(matterParticipants.userId, userId),
      ),
    )
    .limit(1)
  const canDecide = me ? DECIDING_ROLES.has(me.role) : false

  return (
    <div className="mx-auto max-w-3xl space-y-8">
      <div>
        <Button asChild variant="ghost" size="sm">
          <Link href={`/matters/${id}`}>
            <ArrowLeft className="h-4 w-4" />
            Back to matter
          </Link>
        </Button>
      </div>

      <div className="space-y-2">
        <div className="flex flex-wrap items-center gap-2">
          <FileText className="size-5 text-muted-foreground" strokeWidth={1.5} />
          <h1 className="text-display-xs tracking-tight">{document.title}</h1>
          <Badge variant="secondary">v{currentRevision}</Badge>
        </div>
        <p className="text-body-sm text-muted-foreground">
          {seenCurrent.length === 0
            ? `Nobody has acknowledged v${currentRevision} yet.`
            : `${seenCurrent.length} ${seenCurrent.length === 1 ? "person has" : "people have"} acknowledged v${currentRevision}.`}
        </p>
      </div>

      <Card>
        <CardContent className="space-y-4">
          <AckButton documentId={document.id} revision={currentRevision} canDecide={canDecide} />
          <Separator />
          <BumpRevisionButton documentId={document.id} />
          <p className="text-body-sm text-muted-foreground">
            Uploading a new version does not withdraw anything already said. Each
            acknowledgement stays attached to the version it was given against.
          </p>
        </CardContent>
      </Card>

      <div className="space-y-4">
        <h2 className="text-title-sm">The record</h2>

        {acks.length === 0 ? (
          <p className="text-body-sm text-muted-foreground">
            Nothing has been said about this document yet.
          </p>
        ) : (
          <ol className="space-y-3">
            {acks.map((a) => {
              const label = DECISION_LABEL[a.decision] ?? a.decision
              const variant = VARIANT[a.decision] ?? "outline"
              const stale = a.revision !== currentRevision
              return (
                <li key={a.id}>
                  <Card>
                    <CardContent className="space-y-2">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-title-sm">{a.actorName}</span>
                        {a.actorRole && (
                          <span className="text-body-sm text-muted-foreground">{a.actorRole}</span>
                        )}
                        <Badge variant={variant}>{label}</Badge>
                        <Badge variant="outline" className="font-mono text-xs">
                          v{a.revision}
                        </Badge>
                        {stale && (
                          <span className="text-body-sm text-muted-foreground">
                            — about an earlier version
                          </span>
                        )}
                      </div>
                      {a.note && (
                        <p className="text-body-sm whitespace-pre-wrap">{a.note}</p>
                      )}
                      <p className="text-body-sm text-muted-foreground">
                        {format(a.decidedAt, "d MMM yyyy 'at' HH:mm")}
                      </p>
                    </CardContent>
                  </Card>
                </li>
              )
            })}
          </ol>
        )}
      </div>
    </div>
  )
}
