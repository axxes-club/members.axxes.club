import { getSeoSettings } from "@/lib/actions/seo"
export const dynamic = "force-dynamic"

import { PageHeader } from "@/components/layout/page-header"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { GlobalSettingsForm } from "./global-settings-form"
import { RobotsTxtForm } from "./robots-txt-form"
import { SitemapForm } from "./sitemap-form"
import { StructuredDataForm } from "./structured-data-form"

export default async function SeoSettingsPage() {
  const settings = await getSeoSettings()

  return (
    <div className="space-y-8">
      <PageHeader
        heading="SEO Settings"
        description="Configure search engine optimization settings for your site."
      />

      <Tabs defaultValue="global" className="space-y-6">
        <TabsList className="flex-wrap h-auto gap-2">
          <TabsTrigger value="global">Global Settings</TabsTrigger>
          <TabsTrigger value="robots">Robots.txt</TabsTrigger>
          <TabsTrigger value="sitemap">Sitemap</TabsTrigger>
          <TabsTrigger value="structured">Structured Data</TabsTrigger>
        </TabsList>

        <TabsContent value="global">
          <GlobalSettingsForm settings={settings} />
        </TabsContent>

        <TabsContent value="robots">
          <RobotsTxtForm settings={settings} />
        </TabsContent>

        <TabsContent value="sitemap">
          <SitemapForm settings={settings} />
        </TabsContent>

        <TabsContent value="structured">
          <StructuredDataForm settings={settings} />
        </TabsContent>
      </Tabs>
    </div>
  )
}
