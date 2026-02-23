import { getThemeSettings } from "@/lib/actions/theme"

export const dynamic = "force-dynamic"
import { getBrandProfile } from "@/lib/actions/brand"
import { PageHeader } from "@/components/layout/page-header"
import { ThemeModeSelector } from "./theme-mode-selector"
import { BrandThemeToggle } from "./brand-theme-toggle"

export default async function AppearancePage() {
  const [themeSettings, brandProfile] = await Promise.all([
    getThemeSettings(),
    getBrandProfile(),
  ])

  return (
    <div className="space-y-8">
      <PageHeader
        heading="Appearance"
        description="Customize the look and feel of your dashboard."
      />

      <div className="space-y-6">
        <ThemeModeSelector currentMode={themeSettings?.mode || "system"} />
        <BrandThemeToggle
          enabled={themeSettings?.applyBrandColors ?? false}
          brandProfile={brandProfile}
        />
      </div>
    </div>
  )
}
