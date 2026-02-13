"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Switch } from "@/components/ui/switch"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { updateSitemapSettings } from "@/lib/actions/seo"
import type { SeoSettings } from "@/lib/db/schema"

interface SitemapFormProps {
  settings: SeoSettings | null | undefined
}

export function SitemapForm({ settings }: SitemapFormProps) {
  const [loading, setLoading] = useState(false)
  const [sitemapEnabled, setSitemapEnabled] = useState(settings?.sitemapEnabled ?? true)

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setLoading(true)

    const formData = new FormData(e.currentTarget)
    const exclusionsText = formData.get("exclusions") as string
    const exclusions = exclusionsText
      ? exclusionsText.split("\n").map(s => s.trim()).filter(Boolean)
      : []

    await updateSitemapSettings({
      sitemapEnabled,
      sitemapExclusions: exclusions,
    })

    setLoading(false)
  }

  const exclusionsText = (settings?.sitemapExclusions as string[] | null)?.join("\n") || ""

  return (
    <Card>
      <CardHeader>
        <CardTitle>Sitemap Configuration</CardTitle>
        <CardDescription>
          Configure how your sitemap is generated for search engines.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="flex items-center justify-between rounded-lg border p-4">
            <div className="space-y-0.5">
              <Label htmlFor="sitemapEnabled">Enable Sitemap</Label>
              <p className="text-sm text-muted-foreground">
                Generate an XML sitemap for search engines.
              </p>
            </div>
            <Switch
              id="sitemapEnabled"
              checked={sitemapEnabled}
              onCheckedChange={setSitemapEnabled}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="exclusions">Excluded Paths</Label>
            <Textarea
              id="exclusions"
              name="exclusions"
              defaultValue={exclusionsText}
              placeholder={"/admin\n/private\n/api"}
              rows={6}
              className="font-mono text-sm"
              disabled={!sitemapEnabled}
            />
            <p className="text-xs text-muted-foreground">
              Enter one path per line. These paths will not be included in the sitemap.
            </p>
          </div>

          <div className="rounded-lg bg-muted p-4">
            <h4 className="text-sm font-medium mb-2">Included in Sitemap</h4>
            <ul className="text-xs text-muted-foreground space-y-1">
              <li>/ (Homepage)</li>
              <li>/events/* (All public events)</li>
              <li>/products/* (All public products)</li>
            </ul>
          </div>

          <div className="flex justify-end">
            <Button type="submit" disabled={loading}>
              {loading ? "Saving..." : "Save Changes"}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  )
}
