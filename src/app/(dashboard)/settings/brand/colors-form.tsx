"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { updateBrandColors } from "@/lib/actions/brand"
import type { BrandProfile } from "@/lib/db/schema"

interface ColorsFormProps {
  profile: BrandProfile | null | undefined
}

function ColorInput({
  id,
  label,
  defaultValue,
  description,
}: {
  id: string
  label: string
  defaultValue?: string
  description?: string
}) {
  const [color, setColor] = useState(defaultValue || "#000000")

  return (
    <div className="space-y-2">
      <Label htmlFor={id}>{label}</Label>
      <div className="flex gap-2">
        <div
          className="h-10 w-10 rounded-md border cursor-pointer shrink-0"
          style={{ backgroundColor: color }}
          onClick={() => document.getElementById(`${id}-picker`)?.click()}
        />
        <input
          type="color"
          id={`${id}-picker`}
          value={color}
          onChange={(e) => setColor(e.target.value)}
          className="sr-only"
        />
        <Input
          id={id}
          name={id}
          value={color}
          onChange={(e) => setColor(e.target.value)}
          placeholder="#000000"
          className="font-mono uppercase"
        />
      </div>
      {description && (
        <p className="text-xs text-muted-foreground">{description}</p>
      )}
    </div>
  )
}

export function ColorsForm({ profile }: ColorsFormProps) {
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setLoading(true)

    const formData = new FormData(e.currentTarget)
    await updateBrandColors({
      primaryColor: formData.get("primaryColor") as string || undefined,
      secondaryColor: formData.get("secondaryColor") as string || undefined,
      accentColor: formData.get("accentColor") as string || undefined,
      backgroundColor: formData.get("backgroundColor") as string || undefined,
      backgroundColorDark: formData.get("backgroundColorDark") as string || undefined,
      textColor: formData.get("textColor") as string || undefined,
      textColorDark: formData.get("textColorDark") as string || undefined,
    })

    setLoading(false)
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Brand Colors</CardTitle>
        <CardDescription>
          Define your color palette for consistent branding across all outputs.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-8">
          {/* Primary Colors */}
          <div>
            <h3 className="text-sm font-medium mb-4">Primary Colors</h3>
            <div className="grid gap-6 sm:grid-cols-3">
              <ColorInput
                id="primaryColor"
                label="Primary Color"
                defaultValue={profile?.primaryColor || "#000000"}
                description="Main brand color used for logos, headers, buttons."
              />
              <ColorInput
                id="secondaryColor"
                label="Secondary Color"
                defaultValue={profile?.secondaryColor || "#666666"}
                description="Supporting color for accents and backgrounds."
              />
              <ColorInput
                id="accentColor"
                label="Accent Color"
                defaultValue={profile?.accentColor || "#6366F1"}
                description="Highlight color for CTAs and important elements."
              />
            </div>
          </div>

          {/* Background Colors */}
          <div>
            <h3 className="text-sm font-medium mb-4">Background Colors</h3>
            <div className="grid gap-6 sm:grid-cols-2">
              <ColorInput
                id="backgroundColor"
                label="Light Background"
                defaultValue={profile?.backgroundColor || "#FFFFFF"}
                description="Default background for light mode/print."
              />
              <ColorInput
                id="backgroundColorDark"
                label="Dark Background"
                defaultValue={profile?.backgroundColorDark || "#0A0A0A"}
                description="Background for dark mode/digital screens."
              />
            </div>
          </div>

          {/* Text Colors */}
          <div>
            <h3 className="text-sm font-medium mb-4">Text Colors</h3>
            <div className="grid gap-6 sm:grid-cols-2">
              <ColorInput
                id="textColor"
                label="Light Mode Text"
                defaultValue={profile?.textColor || "#000000"}
                description="Primary text color on light backgrounds."
              />
              <ColorInput
                id="textColorDark"
                label="Dark Mode Text"
                defaultValue={profile?.textColorDark || "#FFFFFF"}
                description="Primary text color on dark backgrounds."
              />
            </div>
          </div>

          {/* Preview */}
          <div>
            <h3 className="text-sm font-medium mb-4">Preview</h3>
            <div className="grid gap-4 sm:grid-cols-2">
              <div
                className="rounded-lg p-6 border"
                style={{
                  backgroundColor: profile?.backgroundColor || "#FFFFFF",
                  color: profile?.textColor || "#000000",
                }}
              >
                <h4 className="font-semibold mb-2" style={{ color: profile?.primaryColor || "#000000" }}>
                  Light Mode Preview
                </h4>
                <p className="text-sm">This is how your brand looks on light backgrounds.</p>
                <button
                  type="button"
                  className="mt-4 px-4 py-2 rounded text-sm font-medium text-white"
                  style={{ backgroundColor: profile?.accentColor || "#6366F1" }}
                >
                  Action Button
                </button>
              </div>
              <div
                className="rounded-lg p-6 border"
                style={{
                  backgroundColor: profile?.backgroundColorDark || "#0A0A0A",
                  color: profile?.textColorDark || "#FFFFFF",
                }}
              >
                <h4 className="font-semibold mb-2" style={{ color: profile?.accentColor || "#6366F1" }}>
                  Dark Mode Preview
                </h4>
                <p className="text-sm">This is how your brand looks on dark backgrounds.</p>
                <button
                  type="button"
                  className="mt-4 px-4 py-2 rounded text-sm font-medium"
                  style={{
                    backgroundColor: profile?.primaryColor || "#FFFFFF",
                    color: profile?.backgroundColorDark || "#0A0A0A",
                  }}
                >
                  Action Button
                </button>
              </div>
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
