import { PageHeader } from "@/components/layout/page-header"
import { SectionHeader } from "@/components/layout/section-header"
import { getWebsiteSettings } from "@/lib/actions/website-settings"
import { DomainSettings } from "./domain-settings"
import { NavigationSettings } from "./navigation-settings"
import { AnalyticsSettings } from "./analytics-settings"

export default async function WebsiteSettingsPage() {
  const settings = await getWebsiteSettings()

  return (
    <div className="space-y-8">
      <PageHeader
        heading="Website Settings"
        description="Configure your website's global settings"
      />

      <SectionHeader
        number="01"
        title="Domain & URL"
        description="Set up your website's domain"
      />
      <DomainSettings settings={settings} />

      <SectionHeader
        number="02"
        title="Navigation & Layout"
        description="Configure navigation and footer styles"
      />
      <NavigationSettings settings={settings} />

      <SectionHeader
        number="03"
        title="Analytics"
        description="Connect your analytics tools"
      />
      <AnalyticsSettings settings={settings} />
    </div>
  )
}
