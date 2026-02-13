"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import { Palette, ExternalLink } from "lucide-react"
import { updateApplyBrandColors } from "@/lib/actions/theme"
import type { BrandProfile } from "@/lib/db/schema"
import Link from "next/link"

interface BrandThemeToggleProps {
  enabled: boolean
  brandProfile: BrandProfile | null | undefined
}

export function BrandThemeToggle({ enabled, brandProfile }: BrandThemeToggleProps) {
  const router = useRouter()
  const [isEnabled, setIsEnabled] = useState(enabled)
  const [loading, setLoading] = useState(false)

  const hasBrandColors = brandProfile?.primaryColor && brandProfile?.primaryColor !== "#000000"

  async function handleToggle(checked: boolean) {
    setIsEnabled(checked)
    setLoading(true)
    await updateApplyBrandColors(checked)
    setLoading(false)
    router.refresh()
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Brand Colors</CardTitle>
        <CardDescription>
          Apply your brand profile colors to the dashboard interface.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="flex items-center justify-between rounded-lg border p-4">
          <div className="flex items-center gap-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-muted">
              <Palette className="h-5 w-5" />
            </div>
            <div className="space-y-0.5">
              <Label htmlFor="applyBrandColors" className="text-base">
                Apply Brand Profile
              </Label>
              <p className="text-sm text-muted-foreground">
                Use your brand colors for buttons, accents, and highlights
              </p>
            </div>
          </div>
          <Switch
            id="applyBrandColors"
            checked={isEnabled}
            onCheckedChange={handleToggle}
            disabled={loading || !hasBrandColors}
          />
        </div>

        {!hasBrandColors && (
          <div className="rounded-lg bg-muted p-4">
            <p className="text-sm text-muted-foreground mb-3">
              Set up your brand colors first to enable this feature.
            </p>
            <Link href="/settings/brand">
              <Button variant="outline" size="sm">
                <Palette className="h-4 w-4" />
                Configure Brand Profile
                <ExternalLink className="h-3 w-3" />
              </Button>
            </Link>
          </div>
        )}

        {hasBrandColors && (
          <div className="space-y-3">
            <Label className="text-sm font-medium">Current Brand Colors</Label>
            <div className="flex gap-3">
              {brandProfile?.primaryColor && (
                <div className="flex items-center gap-2">
                  <div
                    className="h-8 w-8 rounded-md border"
                    style={{ backgroundColor: brandProfile.primaryColor }}
                  />
                  <div className="text-xs">
                    <p className="font-medium">Primary</p>
                    <p className="text-muted-foreground">{brandProfile.primaryColor}</p>
                  </div>
                </div>
              )}
              {brandProfile?.secondaryColor && (
                <div className="flex items-center gap-2">
                  <div
                    className="h-8 w-8 rounded-md border"
                    style={{ backgroundColor: brandProfile.secondaryColor }}
                  />
                  <div className="text-xs">
                    <p className="font-medium">Secondary</p>
                    <p className="text-muted-foreground">{brandProfile.secondaryColor}</p>
                  </div>
                </div>
              )}
              {brandProfile?.accentColor && (
                <div className="flex items-center gap-2">
                  <div
                    className="h-8 w-8 rounded-md border"
                    style={{ backgroundColor: brandProfile.accentColor }}
                  />
                  <div className="text-xs">
                    <p className="font-medium">Accent</p>
                    <p className="text-muted-foreground">{brandProfile.accentColor}</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
