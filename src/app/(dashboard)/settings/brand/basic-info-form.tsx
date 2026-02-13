"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { updateBrandBasicInfo } from "@/lib/actions/brand"
import type { BrandProfile } from "@/lib/db/schema"

interface BasicInfoFormProps {
  profile: BrandProfile | null | undefined
}

export function BasicInfoForm({ profile }: BasicInfoFormProps) {
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setLoading(true)

    const formData = new FormData(e.currentTarget)
    await updateBrandBasicInfo({
      brandName: formData.get("brandName") as string,
      tagline: formData.get("tagline") as string || undefined,
      description: formData.get("description") as string || undefined,
      shortDescription: formData.get("shortDescription") as string || undefined,
    })

    setLoading(false)
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Basic Information</CardTitle>
        <CardDescription>
          Core brand identity elements used across all outputs.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid gap-6 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="brandName">Brand Name *</Label>
              <Input
                id="brandName"
                name="brandName"
                defaultValue={profile?.brandName || ""}
                placeholder="Your brand name"
                required
              />
              <p className="text-xs text-muted-foreground">
                The primary name shown on tickets, websites, and merchandise.
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="tagline">Tagline</Label>
              <Input
                id="tagline"
                name="tagline"
                defaultValue={profile?.tagline || ""}
                placeholder="Your catchy tagline"
              />
              <p className="text-xs text-muted-foreground">
                A short memorable phrase that captures your brand essence.
              </p>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="shortDescription">Short Description</Label>
            <Input
              id="shortDescription"
              name="shortDescription"
              defaultValue={profile?.shortDescription || ""}
              placeholder="Brief description (1-2 sentences)"
            />
            <p className="text-xs text-muted-foreground">
              Used in tight spaces like social bios and ticket footers.
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Full Description</Label>
            <Textarea
              id="description"
              name="description"
              defaultValue={profile?.description || ""}
              placeholder="Detailed brand description..."
              rows={4}
            />
            <p className="text-xs text-muted-foreground">
              Full brand story for websites, about pages, and marketing materials.
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
