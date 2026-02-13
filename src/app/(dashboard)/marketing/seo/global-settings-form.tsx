"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { updateSeoGlobalSettings } from "@/lib/actions/seo"
import type { SeoSettings } from "@/lib/db/schema"

interface GlobalSettingsFormProps {
  settings: SeoSettings | null | undefined
}

export function GlobalSettingsForm({ settings }: GlobalSettingsFormProps) {
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setLoading(true)

    const formData = new FormData(e.currentTarget)
    await updateSeoGlobalSettings({
      siteName: formData.get("siteName") as string || undefined,
      siteDescription: formData.get("siteDescription") as string || undefined,
      defaultOgImage: formData.get("defaultOgImage") as string || undefined,
      twitterHandle: formData.get("twitterHandle") as string || undefined,
    })

    setLoading(false)
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Global SEO Settings</CardTitle>
        <CardDescription>
          Default SEO values used across your entire site.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid gap-6 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="siteName">Site Name</Label>
              <Input
                id="siteName"
                name="siteName"
                defaultValue={settings?.siteName || ""}
                placeholder="Your Site Name"
              />
              <p className="text-xs text-muted-foreground">
                Used in title tags and Open Graph metadata.
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="twitterHandle">Twitter Handle</Label>
              <Input
                id="twitterHandle"
                name="twitterHandle"
                defaultValue={settings?.twitterHandle || ""}
                placeholder="@yourhandle"
              />
              <p className="text-xs text-muted-foreground">
                Used for Twitter Card attribution.
              </p>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="siteDescription">Site Description</Label>
            <Textarea
              id="siteDescription"
              name="siteDescription"
              defaultValue={settings?.siteDescription || ""}
              placeholder="A brief description of your site..."
              rows={3}
            />
            <p className="text-xs text-muted-foreground">
              Default meta description (150-160 characters recommended).
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="defaultOgImage">Default OG Image URL</Label>
            <Input
              id="defaultOgImage"
              name="defaultOgImage"
              type="url"
              defaultValue={settings?.defaultOgImage || ""}
              placeholder="https://example.com/og-image.jpg"
            />
            <p className="text-xs text-muted-foreground">
              Default image for social shares (1200x630px recommended).
            </p>
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
