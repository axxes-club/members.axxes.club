"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import { Loader2, Globe, Link2 } from "lucide-react"
import { updateSubdomain, updateCustomDomain } from "@/lib/actions/website-settings"
import type { WebsiteSettings } from "@/lib/db/schema"

interface DomainSettingsProps {
  settings: WebsiteSettings | null | undefined
}

export function DomainSettings({ settings }: DomainSettingsProps) {
  const router = useRouter()
  const [subdomain, setSubdomain] = useState(settings?.subdomain || "")
  const [customDomain, setCustomDomain] = useState(settings?.customDomain || "")
  const [isSavingSubdomain, setIsSavingSubdomain] = useState(false)
  const [isSavingCustomDomain, setIsSavingCustomDomain] = useState(false)
  const [subdomainError, setSubdomainError] = useState("")
  const [customDomainError, setCustomDomainError] = useState("")

  const handleSubdomainSave = async () => {
    setIsSavingSubdomain(true)
    setSubdomainError("")
    try {
      await updateSubdomain(subdomain)
      router.refresh()
    } catch (error) {
      setSubdomainError(error instanceof Error ? error.message : "Failed to save")
    } finally {
      setIsSavingSubdomain(false)
    }
  }

  const handleCustomDomainSave = async () => {
    setIsSavingCustomDomain(true)
    setCustomDomainError("")
    try {
      await updateCustomDomain(customDomain || null)
      router.refresh()
    } catch (error) {
      setCustomDomainError(error instanceof Error ? error.message : "Failed to save")
    } finally {
      setIsSavingCustomDomain(false)
    }
  }

  return (
    <div className="grid gap-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Globe className="h-5 w-5" />
            Subdomain
          </CardTitle>
          <CardDescription>
            Your website will be accessible at your-subdomain.members.axxes.club
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-2">
            <Input
              value={subdomain}
              onChange={(e) => setSubdomain(e.target.value.toLowerCase())}
              placeholder="mysite"
              className="max-w-[200px]"
            />
            <span className="text-muted-foreground">.members.axxes.club</span>
          </div>
          {subdomainError && (
            <p className="text-sm text-destructive">{subdomainError}</p>
          )}
          <Button
            onClick={handleSubdomainSave}
            disabled={isSavingSubdomain || !subdomain}
          >
            {isSavingSubdomain && <Loader2 className="h-4 w-4 animate-spin" />}
            Save Subdomain
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Link2 className="h-5 w-5" />
            Custom Domain
          </CardTitle>
          <CardDescription>
            Use your own domain for your website (requires DNS configuration)
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Domain</Label>
            <Input
              value={customDomain}
              onChange={(e) => setCustomDomain(e.target.value.toLowerCase())}
              placeholder="www.example.com"
              className="max-w-[300px]"
            />
          </div>
          {customDomainError && (
            <p className="text-sm text-destructive">{customDomainError}</p>
          )}
          <Button
            onClick={handleCustomDomainSave}
            disabled={isSavingCustomDomain}
          >
            {isSavingCustomDomain && <Loader2 className="h-4 w-4 animate-spin" />}
            {customDomain ? "Save Domain" : "Remove Domain"}
          </Button>

          {customDomain && (
            <div className="rounded-lg border p-4 bg-muted/50">
              <p className="text-sm font-medium mb-2">DNS Configuration</p>
              <p className="text-xs text-muted-foreground mb-2">
                Add the following CNAME record to your DNS settings:
              </p>
              <div className="font-mono text-xs bg-background p-2 rounded border">
                <p>Type: CNAME</p>
                <p>Name: {customDomain.startsWith("www.") ? "www" : "@"}</p>
                <p>Value: cname.members.axxes.club</p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
