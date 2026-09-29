import type { Metadata } from "next"
import Link from "next/link"
import { notFound } from "next/navigation"
import { ArrowRight, Check, ExternalLink, FolderOpen, KeyRound } from "lucide-react"
import { PageHeader } from "@/components/layout/page-header"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { requireTenantAccess } from "@/lib/auth/tenant-context"
import { getProduct, getProducts, type CatalogProduct } from "@/lib/actions/products"
import { ProductIcon } from "../product-icon"

export const dynamic = "force-dynamic"

type Params = { params: Promise<{ key: string }> }

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { key } = await params
  const product = await getProduct(key)
  if (!product) return { title: "App" }
  return { title: product.name, description: product.tagline }
}

/**
 * One landing page for every app in the suite.
 *
 * This route is driven by the catalog rather than written per app, which is the
 * whole point: a product that reaches the suite gets a page here without anyone
 * remembering to build one, and the page cannot then disagree with the launcher
 * because it is reading the same rows. Office has a bespoke page of its own at
 * /office, which is a better experience, not a different mechanism.
 *
 * Everything on it is free. Nothing here mentions a plan, and nothing here reads
 * a subscription — an app that was ever put behind a tier would have to be
 * written to hide these buttons, which is the kind of omission worth noticing.
 */
export default async function AppLandingPage({ params }: Params) {
  const { key } = await params
  const [{ tenantId }, product, all] = await Promise.all([
    requireTenantAccess(),
    getProduct(key),
    getProducts(),
  ])
  if (!product) notFound()
  // Carry the workspace into every outgoing link.
  const entry: CatalogProduct = { ...product, appTenantParam: tenantId }

  const others = all.filter((p) => p.key !== product.key).slice(0, 6)
  // Workspace travels in the link so someone who belongs to several lands in the
  // one they are looking at, not their primary one.
  const suffix = `?tenant=${tenantId}`
  const opensInPortal = Boolean(entry.membersPath)

  return (
    <div className="space-y-10">
      <PageHeader
        heading={entry.name}
        description={entry.tagline}
        actions={
          <div className="flex items-center gap-2">
            <Badge variant="secondary">Free for every member</Badge>
            {entry.sso && (
              <Badge variant="secondary" className="gap-1">
                <KeyRound className="size-3" /> AXXES account
              </Badge>
            )}
            {entry.status !== "live" && <Badge variant="secondary">{entry.status}</Badge>}
          </div>
        }
      />

      {/* The one action that matters, stated once. */}
      <Card>
        <CardContent className="flex flex-col gap-4 p-6 sm:flex-row sm:items-center sm:justify-between">
          <p className="max-w-2xl text-body-md text-muted-foreground">{entry.description}</p>
          {opensInPortal ? (
            <Button asChild>
              <Link href={`${entry.membersPath}${suffix}`}>
                Open {entry.name} <ArrowRight className="size-4" />
              </Link>
            </Button>
          ) : (
            <Button asChild>
              <a href={`${entry.url}${suffix}`} target="_blank" rel="noreferrer">
                Open {entry.name} <ExternalLink className="size-4" />
              </a>
            </Button>
          )}
        </CardContent>
      </Card>

      <section className="grid gap-4 sm:grid-cols-3">
        <Fact icon={<KeyRound className="size-4" />} title="One account">
          Sign in with your AXXES account. No second password, and no separate invite for
          anything in the suite.
        </Fact>
        <Fact icon={<FolderOpen className="size-4" />} title="Works with Folders">
          Files you open or make here can live in AXXES Folders, and a folder can open
          them without leaving the page.
        </Fact>
        <Fact icon={<Check className="size-4" />} title="Free, for everyone">
          No upgrade, no seat, no tier. Every member of your workspace gets everything
          on this page.
        </Fact>
      </section>

      <section className="space-y-3">
        <h2 className="text-body-md font-medium">The rest of AXXES</h2>
        <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
          {others.map((p) => (
            <Link key={p.key} href={`/apps/${p.key}`} className="group">
              <Card interactive className="h-full">
                <CardContent className="flex items-center gap-3 p-4">
                  <span className="flex size-8 shrink-0 items-center justify-center rounded-lg border border-border bg-muted">
                    <ProductIcon name={p.icon} className="size-4" />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-body-md group-hover:underline">
                      {p.name}
                    </span>
                    <span className="block truncate text-body-sm text-muted-foreground">
                      {p.tagline}
                    </span>
                  </span>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      </section>
    </div>
  )
}

function Fact({ icon, title, children }: { icon: React.ReactNode; title: string; children: React.ReactNode }) {
  return (
    <Card>
      <CardContent className="space-y-2 p-5">
        <div className="flex items-center gap-2">
          <span className="text-muted-foreground">{icon}</span>
          <h3 className="text-body-md font-medium">{title}</h3>
        </div>
        <p className="text-body-sm leading-relaxed text-muted-foreground">{children}</p>
      </CardContent>
    </Card>
  )
}
