"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { updateBrandTypography } from "@/lib/actions/brand"
import type { BrandProfile } from "@/lib/db/schema"

interface TypographyFormProps {
  profile: BrandProfile | null | undefined
}

const POPULAR_FONTS = [
  "Inter",
  "Roboto",
  "Open Sans",
  "Lato",
  "Montserrat",
  "Poppins",
  "Playfair Display",
  "Oswald",
  "Raleway",
  "Source Sans Pro",
  "Bebas Neue",
  "Space Grotesk",
  "DM Sans",
  "Manrope",
  "Outfit",
]

export function TypographyForm({ profile }: TypographyFormProps) {
  const [loading, setLoading] = useState(false)
  const [headingFont, setHeadingFont] = useState(profile?.headingFont || "Inter")
  const [bodyFont, setBodyFont] = useState(profile?.bodyFont || "Inter")
  const [accentFont, setAccentFont] = useState(profile?.accentFont || "")

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setLoading(true)

    await updateBrandTypography({
      headingFont,
      bodyFont,
      accentFont: accentFont || undefined,
    })

    setLoading(false)
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Typography</CardTitle>
        <CardDescription>
          Choose fonts that represent your brand personality.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-8">
          <div className="grid gap-6 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>Heading Font</Label>
              <Select value={headingFont} onValueChange={setHeadingFont}>
                <SelectTrigger>
                  <SelectValue placeholder="Select font" />
                </SelectTrigger>
                <SelectContent>
                  {POPULAR_FONTS.map((font) => (
                    <SelectItem key={font} value={font}>
                      {font}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                Used for titles, headlines, and important text.
              </p>
            </div>

            <div className="space-y-2">
              <Label>Body Font</Label>
              <Select value={bodyFont} onValueChange={setBodyFont}>
                <SelectTrigger>
                  <SelectValue placeholder="Select font" />
                </SelectTrigger>
                <SelectContent>
                  {POPULAR_FONTS.map((font) => (
                    <SelectItem key={font} value={font}>
                      {font}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                Used for paragraphs and general content.
              </p>
            </div>

            <div className="space-y-2">
              <Label>Accent Font (Optional)</Label>
              <Select value={accentFont} onValueChange={setAccentFont}>
                <SelectTrigger>
                  <SelectValue placeholder="None" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">None</SelectItem>
                  {POPULAR_FONTS.map((font) => (
                    <SelectItem key={font} value={font}>
                      {font}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                Special font for quotes, callouts, or decorative text.
              </p>
            </div>
          </div>

          {/* Preview */}
          <div>
            <h3 className="text-sm font-medium mb-4">Preview</h3>
            <div className="rounded-lg border p-6 space-y-4">
              <h1
                className="text-3xl font-bold"
                style={{ fontFamily: headingFont }}
              >
                Heading Text Example
              </h1>
              <h2
                className="text-xl font-semibold"
                style={{ fontFamily: headingFont }}
              >
                Subheading Example
              </h2>
              <p
                className="text-base"
                style={{ fontFamily: bodyFont }}
              >
                This is an example of body text that would appear in your tickets,
                website, and marketing materials. It should be easy to read and
                reflect your brand personality.
              </p>
              {accentFont && (
                <blockquote
                  className="text-lg italic border-l-4 pl-4 text-muted-foreground"
                  style={{ fontFamily: accentFont }}
                >
                  "This is how accent text would appear in quotes or callouts."
                </blockquote>
              )}
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
