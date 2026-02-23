"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { updateBrandDesignRules } from "@/lib/actions/brand"
import type { BrandProfile } from "@/lib/db/schema"

interface DesignRules {
  cornerRadius?: string
  buttonStyle?: string
  imageStyle?: string
  shadowStyle?: string
  doList?: string[]
  dontList?: string[]
  notes?: string
  logoMinSize?: string
  logoClearSpace?: string
}

interface DesignRulesFormProps {
  profile: BrandProfile | null | undefined
}

const DONT_PLACEHOLDER = `Don't stretch the logo
Don't use unapproved colors
Don't add effects to logo`

export function DesignRulesForm({ profile }: DesignRulesFormProps) {
  const [loading, setLoading] = useState(false)
  const rules = (profile?.designRules as DesignRules) || {}

  const [cornerRadius, setCornerRadius] = useState(rules.cornerRadius || "8px")
  const [buttonStyle, setButtonStyle] = useState(rules.buttonStyle || "filled")
  const [imageStyle, setImageStyle] = useState(rules.imageStyle || "rounded")
  const [shadowStyle, setShadowStyle] = useState(rules.shadowStyle || "subtle")
  const [doList, setDoList] = useState(rules.doList?.join("\n") || "")
  const [dontList, setDontList] = useState(rules.dontList?.join("\n") || "")
  const [notes, setNotes] = useState(rules.notes || "")

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setLoading(true)

    const formData = new FormData(e.currentTarget)
    await updateBrandDesignRules({
      designRules: {
        logoMinSize: formData.get("logoMinSize") as string || undefined,
        logoClearSpace: formData.get("logoClearSpace") as string || undefined,
        cornerRadius,
        buttonStyle: buttonStyle as "filled" | "outline" | "ghost",
        imageStyle: imageStyle as "sharp" | "rounded" | "circular",
        shadowStyle: shadowStyle as "none" | "subtle" | "medium" | "dramatic",
        doList: doList.split("\n").filter(Boolean),
        dontList: dontList.split("\n").filter(Boolean),
        notes,
      },
    })

    setLoading(false)
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Design Rules</CardTitle>
        <CardDescription>
          Establish consistent design patterns for your brand.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-8">
          {/* Logo Rules */}
          <div>
            <h3 className="text-sm font-medium mb-4">Logo Usage</h3>
            <div className="grid gap-6 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="logoMinSize">Minimum Logo Size</Label>
                <Input
                  id="logoMinSize"
                  name="logoMinSize"
                  defaultValue={rules.logoMinSize || ""}
                  placeholder="e.g., 40px or 1 inch"
                />
                <p className="text-xs text-muted-foreground">
                  Smallest size the logo should appear.
                </p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="logoClearSpace">Clear Space</Label>
                <Input
                  id="logoClearSpace"
                  name="logoClearSpace"
                  defaultValue={rules.logoClearSpace || ""}
                  placeholder="e.g., 2x logo height"
                />
                <p className="text-xs text-muted-foreground">
                  Minimum space around the logo.
                </p>
              </div>
            </div>
          </div>

          {/* Visual Style */}
          <div>
            <h3 className="text-sm font-medium mb-4">Visual Style</h3>
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
              <div className="space-y-2">
                <Label>Corner Radius</Label>
                <Select value={cornerRadius} onValueChange={setCornerRadius}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="0">Sharp (0px)</SelectItem>
                    <SelectItem value="4px">Subtle (4px)</SelectItem>
                    <SelectItem value="8px">Medium (8px)</SelectItem>
                    <SelectItem value="12px">Rounded (12px)</SelectItem>
                    <SelectItem value="9999px">Pill (full)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Button Style</Label>
                <Select value={buttonStyle} onValueChange={setButtonStyle}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="filled">Filled</SelectItem>
                    <SelectItem value="outline">Outline</SelectItem>
                    <SelectItem value="ghost">Ghost</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Image Style</Label>
                <Select value={imageStyle} onValueChange={setImageStyle}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="sharp">Sharp corners</SelectItem>
                    <SelectItem value="rounded">Rounded corners</SelectItem>
                    <SelectItem value="circular">Circular</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Shadow Style</Label>
                <Select value={shadowStyle} onValueChange={setShadowStyle}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">None</SelectItem>
                    <SelectItem value="subtle">Subtle</SelectItem>
                    <SelectItem value="medium">Medium</SelectItem>
                    <SelectItem value="dramatic">Dramatic</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          {/* Do's and Don'ts */}
          <div>
            <h3 className="text-sm font-medium mb-4">Brand Guidelines</h3>
            <div className="grid gap-6 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="doList">{`Do's (one per line)`}</Label>
                <Textarea
                  id="doList"
                  value={doList}
                  onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setDoList(e.target.value)}
                  placeholder="Use logo on clean backgrounds&#10;Maintain clear space&#10;Use approved colors"
                  rows={5}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="dontList">{`Don'ts (one per line)`}</Label>
                <Textarea
                  id="dontList"
                  value={dontList}
                  onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setDontList(e.target.value)}
                  placeholder={DONT_PLACEHOLDER}
                  rows={5}
                />
              </div>
            </div>
          </div>

          {/* Notes */}
          <div className="space-y-2">
            <Label htmlFor="notes">Additional Notes</Label>
            <Textarea
              id="notes"
              value={notes}
              onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setNotes(e.target.value)}
              placeholder="Any additional design guidelines or notes..."
              rows={3}
            />
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