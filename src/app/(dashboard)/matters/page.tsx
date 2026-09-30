import Link from "next/link"
import { redirect } from "next/navigation"
export const dynamic = "force-dynamic"

import { PageHeader } from "@/components/layout/page-header"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Scale, Plus, FileText, CheckCircle2, ListTodo } from "lucide-react"
import { listMatters } from "@/lib/actions/matters"
import { STAGE_LABEL } from "@/lib/matters"

export default async function MattersPage() {
  const rows = await listMatters()
  if (!rows) redirect("/dashboard")

  return (
    <div className="space-y-8">
      <PageHeader
        heading="Matters"
        description="A case, the people in it, and a record of who has seen what."
        actions={
          <Link href="/matters/new">
            <Button>
              <Plus className="h-4 w-4" />
              Start a matter
            </Button>
          </Link>
        }
      />

      {rows.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center gap-4 py-16 text-center">
            <Scale className="size-10 text-muted-foreground" strokeWidth={1.5} />
            <div className="space-y-1">
              <p className="text-title-sm">Nothing open</p>
              <p className="max-w-md text-body-sm text-muted-foreground">
                A matter holds the documents, the dates and the people for one thing
                being settled. Start one and it opens with a plan already on it.
              </p>
            </div>
            <Link href="/matters/new">
              <Button variant="outline">
                <Plus className="h-4 w-4" />
                Start a matter
              </Button>
            </Link>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {rows.map((m) => (
            <Link key={m.id} href={`/matters/${m.id}`}>
              <Card className="h-full transition-colors hover:border-foreground/25">
                <CardContent className="space-y-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 space-y-1">
                      <p className="truncate text-title-sm">{m.title}</p>
                      <p className="text-body-sm text-muted-foreground">
                        {m.templateKey === "business" ? "Business succession" : "Family succession"}
                        {m.jurisdiction ? ` · ${m.jurisdiction}` : ""}
                      </p>
                    </div>
                    <Badge variant={m.stage === "agreed" || m.stage === "filed" ? "default" : "secondary"}>
                      {STAGE_LABEL[m.stage] ?? m.stage}
                    </Badge>
                  </div>

                  {m.summary && (
                    <p className="line-clamp-2 text-body-sm text-muted-foreground">{m.summary}</p>
                  )}

                  <div className="flex flex-wrap items-center gap-4 text-body-sm text-muted-foreground">
                    <span className="flex items-center gap-1.5">
                      <FileText className="size-3.5" strokeWidth={1.5} />
                      {m.documentCount} {m.documentCount === 1 ? "document" : "documents"}
                    </span>
                    <span className="flex items-center gap-1.5">
                      <CheckCircle2 className="size-3.5" strokeWidth={1.5} />
                      {m.ackCount} {m.ackCount === 1 ? "acknowledgement" : "acknowledgements"}
                    </span>
                    <span className="flex items-center gap-1.5">
                      <ListTodo className="size-3.5" strokeWidth={1.5} />
                      {m.openTaskCount} open
                    </span>
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
