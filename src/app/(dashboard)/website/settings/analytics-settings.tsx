"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import { Loader2, BarChart3, Facebook } from "lucide-react"
import { updateAnalytics } from "@/lib/actions/website-settings"
import type { WebsiteSettings } from "@/lib/db/schema"

interface AnalyticsSettingsProps {
  settings: WebsiteSettings | null | undefined
}

export function AnalyticsSettings({ settings }: AnalyticsSettingsProps) {
  const router = useRouter()
  const [googleAnalyticsId, setGoogleAnalyticsId] = useState(settings?.googleAnalyticsId || "")
  const [facebookPixelId, setFacebookPixelId] = useState(settings?.facebookPixelId || "")
  const [isSaving, setIsSaving] = useState(false)

  const handleSave = async () => {
    setIsSaving(true)
    try {
      await updateAnalytics({
        googleAnalyticsId: googleAnalyticsId || null,
        facebookPixelId: facebookPixelId || null,
      })
      router.refresh()
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <div className="grid gap-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5" />
            Google Analytics
          </CardTitle>
          <CardDescription>
            Track website traffic and user behavior with Google Analytics
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Measurement ID</Label>
            <Input
              value={googleAnalyticsId}
              onChange={(e) => setGoogleAnalyticsId(e.target.value)}
              placeholder="G-XXXXXXXXXX"
              className="max-w-[300px]"
            />
            <p className="text-xs text-muted-foreground">
              Find this in Google Analytics &rarr; Admin &rarr; Data Streams
            </p>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Facebook className="h-5 w-5" />
            Facebook Pixel
          </CardTitle>
          <CardDescription>
            Track conversions and build audiences with Facebook Pixel
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Pixel ID</Label>
            <Input
              value={facebookPixelId}
              onChange={(e) => setFacebookPixelId(e.target.value)}
              placeholder="1234567890123456"
              className="max-w-[300px]"
            />
            <p className="text-xs text-muted-foreground">
              Find this in Meta Business Suite &rarr; Events Manager
            </p>
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-end">
        <Button onClick={handleSave} disabled={isSaving}>
          {isSaving && <Loader2 className="h-4 w-4 animate-spin" />}
          Save Analytics Settings
        </Button>
      </div>
    </div>
  )
}
