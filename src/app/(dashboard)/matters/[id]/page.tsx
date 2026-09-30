import Link from "next/link"
import { notFound } from "next/navigation"
import { format, isPast, differenceInDays } from "date-fns"
export const dynamic = "force-dynamic"

import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"
import { Users, FileText, CalendarClock, ListTodo } from "lucide-react"
import { getAuthContext } from "@/lib/auth"
import { getMatter } from "@/lib/actions/matters"
import { STAGE_LABEL } from "@/lib/matters"
import { matterAcks } from "@/lib/db/schema"
import { db } from "@/lib/db"
import { and, desc, eq, inArray } from "drizzle-orm"
import {
  AddDeadlineForm,
  AddDocumentForm,
  AddParticipantForm,
  AddTaskForm,
  TaskToggle,
} from "./matter-actions"

export default async function MatterPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const { userId } = await getAuthContext()
  const matter = await getMatter(id)
  if (!matter) notFound()

  // Every acknowledgement in the matter, so each document row can show who has
  // spoken on its CURRENT revision without an N+1 query per document.
  const ackRows = matter.documents.length
    ? await db
        .select()
        .from(matterAcks)
        .where(inArray(matterAcks.documentId, matter.documents.map((d) => d.id)))
        .orderBy(desc(matterAcks.decidedAt))
    : []

  const byDocument = new Map<string, typeof ackRows>()
  for (const a of ackRows) {
    const list = byDocument.get(a.documentId) ?? []
    list.push(a)
    byDocument.set(a.documentId, list)
  }

  const people = matter.participants.map((p) => ({
    actorKey: p.actorKey,
    displayName: p.displayName,
  }))

  return (
    <div className="space-y-8">
      <div className="space-y-3">
        <div className="flex flex-wrap items-center gap-2">
          <h1 className="text-display-xs tracking-tight">{matter.title}</h1>
          <Badge variant="secondary">{STAGE_LABEL[matter.stage] ?? matter.stage}</Badge>
          <Badge variant="outline">
            {matter.templateKey === "business" ? "Business succession" : "Family succession"}
          </Badge>
        </div>
        {matter.summary && (
          <p className="max-w-2xl text-body-sm text-muted-foreground">{matter.summary}</p>
        )}
        <p className="text-body-sm text-muted-foreground">
          Opened {format(matter.openedAt, "d MMMM yyyy")}
          {matter.jurisdiction ? ` · ${matter.jurisdiction}` : ""}
        </p>
      </div>

      {/* ------------------------------------------------------ Documents */}
      <section className="space-y-3">
        <div className="flex items-center gap-2">
          <FileText className="size-4 text-muted-foreground" strokeWidth={1.5} />
          <h2 className="text-title-sm">Documents</h2>
        </div>
        <AddDocumentForm matterId={matter.id} />

        {matter.documents.length === 0 ? (
          <p className="text-body-sm text-muted-foreground">
            No documents yet. Each one you add starts at v1 with nobody&rsquo;s name on it.
          </p>
        ) : (
          <div className="space-y-2">
            {matter.documents.map((doc) => {
              const acks = byDocument.get(doc.id) ?? []
              const atCurrent = acks.filter((a) => a.revision === doc.revision)
              const latest = new Map<string, (typeof acks)[number]>()
              for (const a of [...acks].reverse()) latest.set(a.actorKey, a)
              const outstanding = matter.participants.filter(
                (p) => latest.get(p.actorKey)?.revision !== doc.revision,
              )
              return (
                <Link key={doc.id} href={`/matters/${matter.id}/documents/${doc.id}`}>
                  <Card className="transition-colors hover:border-foreground/25">
                    <CardContent className="flex flex-wrap items-center justify-between gap-3">
                      <div className="min-w-0 space-y-1">
                        <p className="truncate text-title-sm">{doc.title}</p>
                        {doc.purpose && (
                          <p className="text-body-sm text-muted-foreground">{doc.purpose}</p>
                        )}
                        <p className="text-body-sm text-muted-foreground">
                          {atCurrent.length
                            ? `${atCurrent.length} on v${doc.revision}`
                            : `Nobody on v${doc.revision}`}
                          {outstanding.length > 0 &&
                            ` · ${outstanding.length} outstanding`}
                        </p>
                      </div>
                      <div className="flex shrink-0 items-center gap-2">
                        <Badge variant="outline" className="font-mono text-xs">v{doc.revision}</Badge>
                        <Badge variant="secondary">{acks.length}</Badge>
                      </div>
                    </CardContent>
                  </Card>
                </Link>
              )
            })}
          </div>
        )}
      </section>

      <Separator />

      {/* ------------------------------------------------------- People */}
      <section className="space-y-3">
        <div className="flex items-center gap-2">
          <Users className="size-4 text-muted-foreground" strokeWidth={1.5} />
          <h2 className="text-title-sm">Who is in this</h2>
        </div>
        <p className="max-w-2xl text-body-sm text-muted-foreground">
          Roles here are legal capacity, not permissions. An executor is responsible
          for the estate; a viewer can see everything and decide nothing.
        </p>
        <AddParticipantForm matterId={matter.id} />
        <div className="flex flex-wrap gap-2">
          {matter.participants.map((p) => (
            <Badge key={p.id} variant="outline" className="gap-1.5">
              {p.displayName}
              <span className="text-muted-foreground">· {p.role.replace(/_/g, " ")}</span>
              {p.org && <span className="text-muted-foreground">· {p.org}</span>}
              {!p.userId && <span className="text-muted-foreground">· not signed in</span>}
            </Badge>
          ))}
        </div>
      </section>

      <Separator />

      {/* ---------------------------------------------------- Deadlines */}
      <section className="space-y-3">
        <div className="flex items-center gap-2">
          <CalendarClock className="size-4 text-muted-foreground" strokeWidth={1.5} />
          <h2 className="text-title-sm">Dates</h2>
        </div>
        <AddDeadlineForm matterId={matter.id} />
        {matter.deadlines.length === 0 ? (
          <p className="text-body-sm text-muted-foreground">Nothing on the calendar.</p>
        ) : (
          <ul className="space-y-1.5">
            {matter.deadlines.map((d) => {
              const days = differenceInDays(d.dueAt, new Date())
              return (
                <li key={d.id} className="flex items-baseline justify-between gap-4 text-body-sm">
                  <span>{d.title}</span>
                  <span className={isPast(d.dueAt) && d.status === "open" ? "text-destructive" : "text-muted-foreground"}>
                    {format(d.dueAt, "d MMM yyyy")}
                    {d.status === "open" && days >= 0 && days <= 14 && (
                      <span className="ml-1.5">in {days} {days === 1 ? "day" : "days"}</span>
                    )}
                  </span>
                </li>
              )
            })}
          </ul>
        )}
      </section>

      <Separator />

      {/* -------------------------------------------------------- Tasks */}
      <section className="space-y-3">
        <div className="flex items-center gap-2">
          <ListTodo className="size-4 text-muted-foreground" strokeWidth={1.5} />
          <h2 className="text-title-sm">To do</h2>
        </div>
        <AddTaskForm matterId={matter.id} people={people} />
        {matter.tasks.length === 0 ? (
          <p className="text-body-sm text-muted-foreground">Nothing outstanding.</p>
        ) : (
          <ul className="space-y-2">
            {matter.tasks.map((t) => (
              <li key={t.id} className="flex items-center gap-3">
                <TaskToggle taskId={t.id} />
                <span className={t.status === "done" ? "text-body-sm line-through text-muted-foreground" : "text-body-sm"}>
                  {t.title}
                </span>
                {t.actorName && (
                  <span className="text-body-sm text-muted-foreground">· {t.actorName}</span>
                )}
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  )
}
