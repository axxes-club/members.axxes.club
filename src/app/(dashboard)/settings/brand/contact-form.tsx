"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { updateBrandContact } from "@/lib/actions/brand"
import { Instagram, Twitter, Facebook, Youtube, Linkedin, Music2, Globe } from "lucide-react"
import type { BrandProfile } from "@/lib/db/schema"

interface ContactFormProps {
  profile: BrandProfile | null | undefined
}

export function ContactForm({ profile }: ContactFormProps) {
  const [loading, setLoading] = useState(false)
  const socialLinks = profile?.socialLinks as Record<string, string> || {}

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setLoading(true)

    const formData = new FormData(e.currentTarget)

    // Build socialLinks object, filtering out empty values
    const socialLinks: Record<string, string> = {}
    const socialFields = ["instagram", "tiktok", "twitter", "facebook", "youtube", "linkedin", "spotify", "soundcloud"]
    for (const field of socialFields) {
      const value = formData.get(field) as string
      if (value) socialLinks[field] = value
    }

    await updateBrandContact({
      website: formData.get("website") as string || undefined,
      email: formData.get("email") as string || undefined,
      phone: formData.get("phone") as string || undefined,
      legalName: formData.get("legalName") as string || undefined,
      copyrightText: formData.get("copyrightText") as string || undefined,
      socialLinks: Object.keys(socialLinks).length > 0 ? socialLinks : undefined,
    })

    setLoading(false)
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Contact & Social</CardTitle>
        <CardDescription>
          Contact information and social media links for your brand.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-8">
          {/* Contact Info */}
          <div>
            <h3 className="text-sm font-medium mb-4">Contact Information</h3>
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              <div className="space-y-2">
                <Label htmlFor="website">Website</Label>
                <div className="relative">
                  <Globe className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="website"
                    name="website"
                    defaultValue={profile?.website || ""}
                    placeholder="https://yourbrand.com"
                    className="pl-10"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  name="email"
                  type="email"
                  defaultValue={profile?.email || ""}
                  placeholder="hello@yourbrand.com"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="phone">Phone</Label>
                <Input
                  id="phone"
                  name="phone"
                  type="tel"
                  defaultValue={profile?.phone || ""}
                  placeholder="+1 (555) 000-0000"
                />
              </div>
            </div>
          </div>

          {/* Social Media */}
          <div>
            <h3 className="text-sm font-medium mb-4">Social Media</h3>
            <div className="grid gap-6 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="instagram">Instagram</Label>
                <div className="relative">
                  <Instagram className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="instagram"
                    name="instagram"
                    defaultValue={socialLinks.instagram || ""}
                    placeholder="@yourbrand"
                    className="pl-10"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="tiktok">TikTok</Label>
                <Input
                  id="tiktok"
                  name="tiktok"
                  defaultValue={socialLinks.tiktok || ""}
                  placeholder="@yourbrand"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="twitter">X / Twitter</Label>
                <div className="relative">
                  <Twitter className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="twitter"
                    name="twitter"
                    defaultValue={socialLinks.twitter || ""}
                    placeholder="@yourbrand"
                    className="pl-10"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="facebook">Facebook</Label>
                <div className="relative">
                  <Facebook className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="facebook"
                    name="facebook"
                    defaultValue={socialLinks.facebook || ""}
                    placeholder="yourbrand"
                    className="pl-10"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="youtube">YouTube</Label>
                <div className="relative">
                  <Youtube className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="youtube"
                    name="youtube"
                    defaultValue={socialLinks.youtube || ""}
                    placeholder="@yourbrand"
                    className="pl-10"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="linkedin">LinkedIn</Label>
                <div className="relative">
                  <Linkedin className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="linkedin"
                    name="linkedin"
                    defaultValue={socialLinks.linkedin || ""}
                    placeholder="company/yourbrand"
                    className="pl-10"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="spotify">Spotify</Label>
                <div className="relative">
                  <Music2 className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="spotify"
                    name="spotify"
                    defaultValue={socialLinks.spotify || ""}
                    placeholder="Artist or playlist URL"
                    className="pl-10"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="soundcloud">SoundCloud</Label>
                <Input
                  id="soundcloud"
                  name="soundcloud"
                  defaultValue={socialLinks.soundcloud || ""}
                  placeholder="yourbrand"
                />
              </div>
            </div>
          </div>

          {/* Legal */}
          <div>
            <h3 className="text-sm font-medium mb-4">Legal Information</h3>
            <div className="grid gap-6 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="legalName">Legal Business Name</Label>
                <Input
                  id="legalName"
                  name="legalName"
                  defaultValue={profile?.legalName || ""}
                  placeholder="Your Brand LLC"
                />
                <p className="text-xs text-muted-foreground">
                  Registered business name for legal documents.
                </p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="copyrightText">Copyright Text</Label>
                <Input
                  id="copyrightText"
                  name="copyrightText"
                  defaultValue={profile?.copyrightText || ""}
                  placeholder="© 2024 Your Brand. All rights reserved."
                />
                <p className="text-xs text-muted-foreground">
                  Footer copyright text for websites and documents.
                </p>
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
