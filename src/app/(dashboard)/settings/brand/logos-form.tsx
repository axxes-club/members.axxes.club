"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { updateBrandLogos } from "@/lib/actions/brand"
import { Upload, Image as ImageIcon } from "lucide-react"
import type { BrandProfile } from "@/lib/db/schema"

interface LogosFormProps {
  profile: BrandProfile | null | undefined
}

function LogoUploadField({
  id,
  label,
  defaultValue,
  description,
  aspectHint,
}: {
  id: string
  label: string
  defaultValue?: string
  description?: string
  aspectHint?: string
}) {
  const [url, setUrl] = useState(defaultValue || "")

  return (
    <div className="space-y-2">
      <Label htmlFor={id}>{label}</Label>
      <div className="flex gap-4">
        <div className="h-20 w-20 rounded-lg border-2 border-dashed flex items-center justify-center bg-muted/50 shrink-0 overflow-hidden">
          {url ? (
            <img src={url} alt={label} className="h-full w-full object-contain" />
          ) : (
            <ImageIcon className="h-8 w-8 text-muted-foreground" />
          )}
        </div>
        <div className="flex-1 space-y-2">
          <Input
            id={id}
            name={id}
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="https://... or upload"
          />
          {aspectHint && (
            <p className="text-xs text-muted-foreground">{aspectHint}</p>
          )}
        </div>
      </div>
      {description && (
        <p className="text-xs text-muted-foreground">{description}</p>
      )}
    </div>
  )
}

export function LogosForm({ profile }: LogosFormProps) {
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setLoading(true)

    const formData = new FormData(e.currentTarget)
    await updateBrandLogos({
      logoUrl: formData.get("logoUrl") as string || undefined,
      logoLightUrl: formData.get("logoLightUrl") as string || undefined,
      logoDarkUrl: formData.get("logoDarkUrl") as string || undefined,
      logoIconUrl: formData.get("logoIconUrl") as string || undefined,
      logoHorizontalUrl: formData.get("logoHorizontalUrl") as string || undefined,
      logoVerticalUrl: formData.get("logoVerticalUrl") as string || undefined,
      faviconUrl: formData.get("faviconUrl") as string || undefined,
    })

    setLoading(false)
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Logos & Marks</CardTitle>
        <CardDescription>
          Upload different logo variations for various use cases.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-8">
          {/* Primary Logo */}
          <div>
            <h3 className="text-sm font-medium mb-4">Primary Logo</h3>
            <div className="space-y-6">
              <LogoUploadField
                id="logoUrl"
                label="Main Logo"
                defaultValue={profile?.logoUrl || ""}
                description="Your primary logo used in most contexts."
                aspectHint="Recommended: PNG with transparent background"
              />
            </div>
          </div>

          {/* Color Variants */}
          <div>
            <h3 className="text-sm font-medium mb-4">Color Variants</h3>
            <div className="grid gap-6 sm:grid-cols-2">
              <LogoUploadField
                id="logoLightUrl"
                label="Light Logo (for dark backgrounds)"
                defaultValue={profile?.logoLightUrl || ""}
                description="White or light-colored version."
              />
              <LogoUploadField
                id="logoDarkUrl"
                label="Dark Logo (for light backgrounds)"
                defaultValue={profile?.logoDarkUrl || ""}
                description="Black or dark-colored version."
              />
            </div>
          </div>

          {/* Layout Variants */}
          <div>
            <h3 className="text-sm font-medium mb-4">Layout Variants</h3>
            <div className="grid gap-6 sm:grid-cols-2">
              <LogoUploadField
                id="logoHorizontalUrl"
                label="Horizontal Logo"
                defaultValue={profile?.logoHorizontalUrl || ""}
                description="Wide format for headers and banners."
                aspectHint="Best for website headers, email signatures"
              />
              <LogoUploadField
                id="logoVerticalUrl"
                label="Vertical/Stacked Logo"
                defaultValue={profile?.logoVerticalUrl || ""}
                description="Tall format for mobile and print."
                aspectHint="Best for posters, mobile screens"
              />
            </div>
          </div>

          {/* Icon & Favicon */}
          <div>
            <h3 className="text-sm font-medium mb-4">Icons</h3>
            <div className="grid gap-6 sm:grid-cols-2">
              <LogoUploadField
                id="logoIconUrl"
                label="Logo Mark / Icon"
                defaultValue={profile?.logoIconUrl || ""}
                description="Square icon without text, for small spaces."
                aspectHint="1:1 ratio, minimum 512x512px"
              />
              <LogoUploadField
                id="faviconUrl"
                label="Favicon"
                defaultValue={profile?.faviconUrl || ""}
                description="Browser tab icon."
                aspectHint="32x32px or 64x64px, ICO or PNG"
              />
            </div>
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
