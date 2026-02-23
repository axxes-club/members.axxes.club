import { getBrandProfile } from "@/lib/actions/brand"
import { PageHeader } from "@/components/layout/page-header"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { BasicInfoForm } from "./basic-info-form"
import { ColorsForm } from "./colors-form"
import { LogosForm } from "./logos-form"
import { TypographyForm } from "./typography-form"
import { DesignRulesForm } from "./design-rules-form"
import { ContactForm } from "./contact-form"
import { VoiceToneForm } from "./voice-tone-form"

export const dynamic = "force-dynamic"

export default async function BrandProfilePage() {
  const profile = await getBrandProfile()

  return (
    <div className="space-y-8">
      <PageHeader
        heading="Brand Profile"
        description="Configure your brand identity for tickets, websites, merchandise, and more."
      />

      <Tabs defaultValue="basic" className="space-y-6">
        <TabsList className="flex-wrap h-auto gap-2">
          <TabsTrigger value="basic">Basic Info</TabsTrigger>
          <TabsTrigger value="colors">Colors</TabsTrigger>
          <TabsTrigger value="logos">Logos</TabsTrigger>
          <TabsTrigger value="typography">Typography</TabsTrigger>
          <TabsTrigger value="design">Design Rules</TabsTrigger>
          <TabsTrigger value="contact">Contact & Social</TabsTrigger>
          <TabsTrigger value="voice">Voice & Tone</TabsTrigger>
        </TabsList>

        <TabsContent value="basic">
          <BasicInfoForm profile={profile} />
        </TabsContent>

        <TabsContent value="colors">
          <ColorsForm profile={profile} />
        </TabsContent>

        <TabsContent value="logos">
          <LogosForm profile={profile} />
        </TabsContent>

        <TabsContent value="typography">
          <TypographyForm profile={profile} />
        </TabsContent>

        <TabsContent value="design">
          <DesignRulesForm profile={profile} />
        </TabsContent>

        <TabsContent value="contact">
          <ContactForm profile={profile} />
        </TabsContent>

        <TabsContent value="voice">
          <VoiceToneForm profile={profile} />
        </TabsContent>
      </Tabs>
    </div>
  )
}