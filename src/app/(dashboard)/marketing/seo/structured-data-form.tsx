"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { updateOrganizationSchema } from "@/lib/actions/seo"
import type { SeoSettings } from "@/lib/db/schema"

interface StructuredDataFormProps {
  settings: SeoSettings | null | undefined
}

export function StructuredDataForm({ settings }: StructuredDataFormProps) {
  const [loading, setLoading] = useState(false)

  const orgSchema = settings?.organizationSchema as {
    "@type": string
    name: string
    logo?: string
    url?: string
    sameAs?: string[]
    contactPoint?: { "@type": string; telephone: string; contactType: string }
  } | null

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setLoading(true)

    const formData = new FormData(e.currentTarget)
    const sameAsText = formData.get("sameAs") as string
    const sameAs = sameAsText
      ? sameAsText.split("\n").map(s => s.trim()).filter(Boolean)
      : undefined

    const telephone = formData.get("telephone") as string
    const contactType = formData.get("contactType") as string

    await updateOrganizationSchema({
      organizationSchema: {
        "@type": "Organization",
        name: formData.get("name") as string,
        logo: formData.get("logo") as string || undefined,
        url: formData.get("url") as string || undefined,
        sameAs,
        contactPoint: telephone ? {
          "@type": "ContactPoint",
          telephone,
          contactType: contactType || "customer service",
        } : undefined,
      },
    })

    setLoading(false)
  }

  const previewData = {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: orgSchema?.name || "Your Organization",
    logo: orgSchema?.logo,
    url: orgSchema?.url,
    sameAs: orgSchema?.sameAs,
    contactPoint: orgSchema?.contactPoint,
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Organization Structured Data</CardTitle>
        <CardDescription>
          JSON-LD structured data helps search engines understand your organization.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid gap-6 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="name">Organization Name *</Label>
              <Input
                id="name"
                name="name"
                defaultValue={orgSchema?.name || ""}
                placeholder="Your Organization Name"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="url">Website URL</Label>
              <Input
                id="url"
                name="url"
                type="url"
                defaultValue={orgSchema?.url || ""}
                placeholder="https://yoursite.com"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="logo">Logo URL</Label>
            <Input
              id="logo"
              name="logo"
              type="url"
              defaultValue={orgSchema?.logo || ""}
              placeholder="https://yoursite.com/logo.png"
            />
            <p className="text-xs text-muted-foreground">
              A square logo image URL (112x112px minimum).
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="sameAs">Social Profiles</Label>
            <Textarea
              id="sameAs"
              name="sameAs"
              defaultValue={orgSchema?.sameAs?.join("\n") || ""}
              placeholder={"https://twitter.com/yourprofile\nhttps://instagram.com/yourprofile\nhttps://linkedin.com/company/yourcompany"}
              rows={4}
            />
            <p className="text-xs text-muted-foreground">
              Enter one social profile URL per line.
            </p>
          </div>

          <div className="grid gap-6 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="telephone">Contact Phone</Label>
              <Input
                id="telephone"
                name="telephone"
                type="tel"
                defaultValue={orgSchema?.contactPoint?.telephone || ""}
                placeholder="+1-800-555-0123"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="contactType">Contact Type</Label>
              <Input
                id="contactType"
                name="contactType"
                defaultValue={orgSchema?.contactPoint?.contactType || "customer service"}
                placeholder="customer service"
              />
            </div>
          </div>

          <div className="rounded-lg bg-muted p-4">
            <h4 className="text-sm font-medium mb-2">JSON-LD Preview</h4>
            <pre className="text-xs text-muted-foreground overflow-x-auto">
              {JSON.stringify(previewData, null, 2)}
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
