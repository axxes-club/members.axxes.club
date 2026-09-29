import Link from "next/link"
import { ExternalLink, KeyRound } from "lucide-react"
import { PageHeader } from "@/components/layout/page-header"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { getCatalogStats, getProductGroups } from "@/lib/actions/products"
import { ProductIcon } from "./product-icon"

export const dynamic = "force-dynamic"

/**
 * The launcher: every in-house AXXES app, in one place.
 *
 * The rule this page exists to enforce is that nobody has to leave the portal
 * to reach something AXXES built. Where the portal has a surface of its own for
 * an app, the tile opens that, in this tab. Only the apps that genuinely are
 * their own place send you off, and those say so.
 *
 * It shows what the catalog marks `surface_in_members`. The horizontal "Work"
 * products are hidden right now — see `db/axxes-products.sql` — but every one
 * of them still works and is still one click from here, so hiding a tile is not
 * the same as withdrawing a product, and the copy here should not imply it is.
 */
export default async function AppsPage() {
  const [groups, stats] = await Promise.all([getProductGroups(), getCatalogStats()])

  return (
    <div className="space-y-8">
      <PageHeader
        heading="Apps"
        description="Everything you need to run a night, in one place."
        actions={
          <div className="flex items-center gap-2">
            <Badge variant="secondary">{stats.total} apps</Badge>
            <Badge variant="secondary">{stats.inPortal} built into the portal</Badge>
            <Badge variant="secondary">{stats.sso} with AXXES sign-in</Badge>
          </div>
        }
      />

      {groups.map((group) => (
        <section key={group.category} className="space-y-4">
          <div className="space-y-1">
            <h2 className="text-title-sm tracking-tight">{group.category}</h2>
            {group.blurb && (
              <p className="text-body-sm text-muted-foreground">{group.blurb}</p>
            )}
          </div>

          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {group.products.map((product) => {
              const inPortal = Boolean(product.membersPath)
              return (
                <Card key={product.key} className="group flex flex-col transition-colors hover:border-foreground/20">
                  {/*
                    The icon is painted with theme tokens, not `product.color`.
                    It used to be `color: product.color` on a `${color}1a` wash,
                    which is unreadable whenever a product ships a near-white or
                    pale brand colour — the Suite's #ededef on a 95%-lightness
                    background was effectively invisible. Colour is also not
                    identity: a suite should look like one suite, and products
                    are told apart by name and icon. The `color` column stays in
                    the catalog for the surfaces that still want it.
                  */}
                  <CardHeader className="flex flex-row items-start gap-3 space-y-0">
                    <span
                      aria-hidden
                      className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-border bg-muted text-foreground"
                    >
                      <ProductIcon name={product.icon} className="h-4 w-4" />
                    </span>
                    <div className="min-w-0 flex-1 space-y-1">
                      <CardTitle className="flex flex-wrap items-center gap-2 text-title-xs">
                        {product.name}
                        {product.status !== "live" && (
                          <Badge variant="outline" className="text-[10px] uppercase tracking-wider">
                            {product.status}
                          </Badge>
                        )}
                      </CardTitle>
                      <CardDescription>{product.tagline}</CardDescription>
                    </div>
                  </CardHeader>

                  <CardContent className="flex flex-1 flex-col gap-4">
                    <p className="flex-1 text-body-sm text-muted-foreground">{product.description}</p>

                    <div className="flex flex-wrap items-center gap-2">
                      {inPortal ? (
                        <Button asChild size="sm">
                          <Link href={product.membersPath!}>Open in portal</Link>
                        </Button>
                      ) : (
                        <Button asChild size="sm" variant="outline">
                          <a href={product.url} target="_blank" rel="noopener noreferrer">
                            Open app
                            <ExternalLink className="ml-2 h-3 w-3" />
                          </a>
                        </Button>
                      )}

                      {/*
                        Every app gets a landing page from the catalog, so this
                        link is always valid — including for products added since
                        this page was written. It is where "what is this, is it
                        free, how does it work with Folders" is answered.
                      */}
                      <Button asChild size="sm" variant="ghost">
                        <Link href={`/apps/${product.key}`}>About</Link>
                      </Button>

                      {!inPortal && product.sso && (
                        <span className="flex items-center gap-1 text-xs text-muted-foreground">
                          <KeyRound className="h-3 w-3" />
                          AXXES sign-in
                        </span>
                      )}
                    </div>
                  </CardContent>
                </Card>
              )
            })}
          </div>
        </section>
      ))}
    </div>
  )
}
