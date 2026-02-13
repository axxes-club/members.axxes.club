"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Switch } from "@/components/ui/switch"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { updateRobotsTxt } from "@/lib/actions/seo"
import type { SeoSettings } from "@/lib/db/schema"

interface RobotsTxtFormProps {
  settings: SeoSettings | null | undefined
}

const defaultRobotsTxt = `User-agent: *
Allow: /

Sitemap: https://yoursite.com/sitemap.xml`

export function RobotsTxtForm({ settings }: RobotsTxtFormProps) {
  const [loading, setLoading] = useState(false)
  const [allowIndexing, setAllowIndexing] = useState(settings?.allowIndexing ?? true)

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setLoading(true)

    const formData = new FormData(e.currentTarget)
    await updateRobotsTxt({
      robotsTxt: formData.get("robotsTxt") as string || undefined,
      allowIndexing,
    })

    setLoading(false)
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Robots.txt Configuration</CardTitle>
        <CardDescription>
          Control how search engines crawl and index your site.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="flex items-center justify-between rounded-lg border p-4">
            <div className="space-y-0.5">
              <Label htmlFor="allowIndexing">Allow Search Engine Indexing</Label>
              <p className="text-sm text-muted-foreground">
                When disabled, search engines will be instructed not to index your site.
              </p>
            </div>
            <Switch
              id="allowIndexing"
              checked={allowIndexing}
              onCheckedChange={setAllowIndexing}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="robotsTxt">Custom Robots.txt</Label>
            <Textarea
              id="robotsTxt"
              name="robotsTxt"
              defaultValue={settings?.robotsTxt || defaultRobotsTxt}
              placeholder={defaultRobotsTxt}
              rows={10}
              className="font-mono text-sm"
            />
            <p className="text-xs text-muted-foreground">
              Advanced: Customize your robots.txt directives. Leave empty to use defaults.
            </p>
          </div>

          <div className="rounded-lg bg-muted p-4">
            <h4 className="text-sm font-medium mb-2">Preview</h4>
            <pre className="text-xs text-muted-foreground whitespace-pre-wrap">
              {!allowIndexing
                ? `User-agent: *\nDisallow: /`
                : (settings?.robotsTxt || defaultRobotsTxt)
              }
            </pre>
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
