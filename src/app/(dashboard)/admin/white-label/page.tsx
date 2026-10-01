import Link from "next/link"
import { redirect } from "next/navigation"
import { ExternalLink } from "lucide-react"
import { PageHeader } from "@/components/layout/page-header"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { getAxxesStaff } from "@/lib/white-label/access"
import { listConvertibleOrganizations, listWhiteLabelCustomers } from "@/lib/actions/white-label"
import { ProvisionForm } from "./provision-form"

export const dynamic = "force-dynamic"

/** White-label customers: organizations that use the AXXES products under their own name. */
export default async function WhiteLabelPage() {
  if (!(await getAxxesStaff())) redirect("/dashboard")
  const [customers, organizations] = await Promise.all([listWhiteLabelCustomers(), listConvertibleOrganizations()])

  return (
    <div className="space-y-8">
      <PageHeader
        heading="White-label customers"
        description="Organizations that use every AXXES product under their own name, logo and colors. Anyone in AXXES CLUB can set one up."
      />

      <Card>
        <CardHeader>
          <CardTitle>Customers</CardTitle>
          <CardDescription>Each one signs in at its own address and sees its branding across the suite.</CardDescription>
        </CardHeader>
        <CardContent className="divide-y">
          {customers.length === 0 && <p className="py-4 text-sm text-muted-foreground">No white-label customers yet.</p>}
          {customers.map((c) => (
            <div key={c.tenantId} className="flex flex-wrap items-center gap-4 py-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-md border bg-white">
                {c.brand.logoIconUrl || c.brand.logoUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={(c.brand.logoIconUrl || c.brand.logoUrl)!} alt="" className="max-h-9 max-w-9 object-contain" />
                ) : (
                  <span className="h-6 w-6 rounded" style={{ background: c.brand.primaryColor ?? "#888" }} />
                )}
              </div>
              <div className="min-w-0 flex-1">
                <Link href={`/admin/white-label/${c.tenantId}`} className="font-medium hover:underline">
                  {c.brand.brandName || c.name}
                </Link>
                <p className="truncate text-xs text-muted-foreground">{c.signInUrl}</p>
              </div>
              <Badge variant={c.whiteLabel.enabled ? "default" : "secondary"}>{c.whiteLabel.enabled ? "Live" : "Off"}</Badge>
              <a href={c.signInUrl} target="_blank" rel="noreferrer" className="text-muted-foreground hover:text-foreground" title="Open their sign-in page">
                <ExternalLink className="h-4 w-4" />
              </a>
            </div>
          ))}
        </CardContent>
      </Card>

      <ProvisionForm organizations={organizations} />
    </div>
  )
}
