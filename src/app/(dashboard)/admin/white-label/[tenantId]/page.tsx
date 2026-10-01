import Link from "next/link"
import { notFound, redirect } from "next/navigation"
import { ArrowLeft } from "lucide-react"
import { PageHeader } from "@/components/layout/page-header"
import { getAxxesStaff } from "@/lib/white-label/access"
import { getWhiteLabelCustomer } from "@/lib/actions/white-label"
import { CustomerForm } from "./customer-form"

export const dynamic = "force-dynamic"

export default async function WhiteLabelCustomerPage({ params }: { params: Promise<{ tenantId: string }> }) {
  if (!(await getAxxesStaff())) redirect("/dashboard")
  const { tenantId } = await params
  const customer = await getWhiteLabelCustomer(tenantId)
  if (!customer) notFound()

  return (
    <div className="space-y-6">
      <Link href="/admin/white-label" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="h-4 w-4" /> White-label customers
      </Link>
      <PageHeader heading={customer.brand.brandName || customer.name} description={customer.signInUrl} />
      <CustomerForm customer={customer} />
    </div>
  )
}
