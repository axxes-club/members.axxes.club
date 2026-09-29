import type { Metadata } from "next"
import Link from "next/link"
import { desc, eq, and, isNull } from "drizzle-orm"
import { formatDistanceToNow } from "date-fns"
import { db } from "@/lib/db"
import { officeDocuments } from "@/lib/db/schema"
import { requireTenantAccess } from "@/lib/auth/tenant-context"
import { appTarget } from "@/lib/dam/app-links"
import { PageHeader } from "@/components/layout/page-header"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"

export const dynamic = "force-dynamic"
export const metadata: Metadata = { title: "Office" }

// Read from the registry so this page and the folder's "Open in" item cannot
// disagree about where Office lives.
const officeTarget = appTarget("office")!

/**
 * The portal's Office surface.
 *
 * Reads the same tables quill.axxes.club writes, rather than mirroring anything:
 * this page is a doorway and the files it lists are the files themselves. Every
 * link carries the workspace, so opening one from a workspace that is not the
 * primary one lands in the right place.
 */
const APPS = [
  { kind: "doc", name: "Quill", tagline: "Documents", accent: "#5b8cff" },
  { kind: "sheet", name: "Tally", tagline: "Spreadsheets", accent: "#3fb950" },
  { kind: "slides", name: "Stage", tagline: "Presentations", accent: "#d29922" },
] as const

export default async function OfficePage() {
  const { tenantId, tenant } = await requireTenantAccess()
  // The relation comes back loosely typed; a workspace always has a name, but
  // the page should not fall over if it somehow does not.
  const workspaceName = (tenant as { name?: string } | null)?.name ?? "your workspace"

  const recent = await db
    .select({
      id: officeDocuments.id,
      kind: officeDocuments.kind,
      title: officeDocuments.title,
      folder: officeDocuments.folder,
      updatedAt: officeDocuments.updatedAt,
    })
    .from(officeDocuments)
    .where(and(eq(officeDocuments.tenantId, tenantId), isNull(officeDocuments.deletedAt)))
    .orderBy(desc(officeDocuments.updatedAt))
    .limit(8)

  const suffix = `?tenant=${tenantId}`
  // One origin, read from the registry, so this page and the folder's
  // "Open in AXXES Office" item can never point at different deployments.
  const appUrl = (path: string) => `${officeTarget.base}/${path}`

  return (
    <div className="space-y-10">
      <PageHeader
        heading="Office"
        description={`Documents, spreadsheets and presentations for ${workspaceName}. Every member can open these — nothing here sits behind an upgrade.`}
        actions={
          <Button asChild size="sm">
            <Link href={`${appUrl("files")}${suffix}`} target="_blank" rel="noreferrer">
              Open AXXES Office
            </Link>
          </Button>
        }
      />

      <div className="grid gap-3 sm:grid-cols-3">
        {APPS.map((app) => (
          <Link
            key={app.kind}
            href={`${appUrl(`files?kind=${app.kind}`)}${suffix}`}
            target="_blank"
            rel="noreferrer"
            className="group"
          >
            <Card interactive className="h-full">
              <CardContent className="space-y-2 p-5">
                <span aria-hidden className="block size-3 rounded" style={{ background: app.accent }} />
                <p className="text-body-md font-medium group-hover:underline">{app.name}</p>
                <p className="text-body-sm text-muted-foreground">{app.tagline}</p>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>

      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-body-md font-medium">Recent files</h2>
          <Link
            href={`${appUrl("files")}${suffix}`}
            target="_blank"
            rel="noreferrer"
            className="text-body-sm text-muted-foreground hover:text-foreground"
          >
            See all →
          </Link>
        </div>

        {recent.length === 0 ? (
          <Card>
            <CardContent className="space-y-4 p-8 text-center">
              <div>
                <p className="text-body-md font-medium">No Office files yet</p>
                <p className="text-body-sm text-muted-foreground">
                  Create a document, spreadsheet or deck and it will show up here.
                </p>
              </div>
              <Button asChild size="sm" variant="outline">
                <Link href={`${appUrl("files/new")}${suffix}`} target="_blank" rel="noreferrer">
                  Create a file
                </Link>
              </Button>
            </CardContent>
          </Card>
        ) : (
          <Card>
            <ul className="divide-y divide-border">
              {recent.map((file) => {
                const accent = APPS.find((a) => a.kind === file.kind)?.accent ?? "#888"
                return (
                  <li key={file.id} className="flex items-center gap-3 px-5 py-3">
                    <span aria-hidden className="size-2.5 shrink-0 rounded" style={{ background: accent }} />
                    <Link
                      href={`${appUrl(`d/${file.id}`)}${suffix}`}
                      target="_blank"
                      rel="noreferrer"
                      className="min-w-0 flex-1"
                    >
                      <span className="block truncate text-body-md hover:underline">{file.title}</span>
                      <span className="block font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
                        {file.folder ?? "Unfiled"} ·{" "}
                        {formatDistanceToNow(file.updatedAt, { addSuffix: true })}
                      </span>
                    </Link>
                    <Button asChild size="sm" variant="ghost">
                      <Link href={`${appUrl(`quicklook/${file.id}`)}${suffix}`} target="_blank" rel="noreferrer">
                        QuickLook
                      </Link>
                    </Button>
                  </li>
                )
              })}
            </ul>
          </Card>
        )}
      </section>
    </div>
  )
}

