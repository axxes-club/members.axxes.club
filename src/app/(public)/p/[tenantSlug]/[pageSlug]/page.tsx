import { notFound } from "next/navigation"
import { getPublicTenantBySlug } from "@/lib/actions/settings"
import { getPublicPage } from "@/lib/actions/pages"
import { getPublicBrandProfile } from "@/lib/actions/brand"
import { PublicPageRenderer } from "./public-page-renderer"

interface PublicPageProps {
  params: Promise<{ tenantSlug: string; pageSlug: string }>
}

export async function generateMetadata({ params }: PublicPageProps) {
  const { tenantSlug, pageSlug } = await params

  const tenant = await getPublicTenantBySlug(tenantSlug)
  if (!tenant) return { title: "Not Found" }

  const page = await getPublicPage(tenant.id, pageSlug)
  if (!page) return { title: "Not Found" }

  return {
    title: page.metaTitle || page.title,
    description: page.metaDescription || page.description,
    openGraph: {
      title: page.metaTitle || page.title,
      description: page.metaDescription || page.description,
      images: page.ogImage ? [page.ogImage] : undefined,
    },
  }
}

export default async function PublicPage({ params }: PublicPageProps) {
  const { tenantSlug, pageSlug } = await params

  const tenant = await getPublicTenantBySlug(tenantSlug)
  if (!tenant) {
    notFound()
  }

  const [page, brandProfile] = await Promise.all([
    getPublicPage(tenant.id, pageSlug),
    getPublicBrandProfile(tenant.id),
  ])

  if (!page) {
    notFound()
  }

  return (
    <PublicPageRenderer
      page={page}
      tenant={tenant}
      brandProfile={brandProfile ?? null}
    />
  )
}
