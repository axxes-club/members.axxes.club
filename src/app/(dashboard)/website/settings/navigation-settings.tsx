"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Switch } from "@/components/ui/switch"
import { Button } from "@/components/ui/button"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Loader2, Menu, PanelTop, EyeOff } from "lucide-react"
import { updateNavigationStyle, updateFooterStyle, updateFooterText, togglePoweredBy } from "@/lib/actions/website-settings"
import type { WebsiteSettings } from "@/lib/db/schema"

interface NavigationSettingsProps {
  settings: WebsiteSettings | null | undefined
}

export function NavigationSettings({ settings }: NavigationSettingsProps) {
  const router = useRouter()
  const [navStyle, setNavStyle] = useState(settings?.navigationStyle || "horizontal")
  const [footerStyle, setFooterStyle] = useState(settings?.footerStyle || "minimal")
  const [footerText, setFooterText] = useState(settings?.footerText || "")
  const [showPoweredBy, setShowPoweredBy] = useState(settings?.showPoweredBy !== "false")
  const [isSaving, setIsSaving] = useState(false)

  const handleNavStyleChange = async (value: string) => {
    setNavStyle(value)
    setIsSaving(true)
    try {
      await updateNavigationStyle(value as "horizontal" | "hamburger" | "none")
      router.refresh()
    } finally {
      setIsSaving(false)
    }
  }

  const handleFooterStyleChange = async (value: string) => {
    setFooterStyle(value)
    setIsSaving(true)
    try {
      await updateFooterStyle(value as "minimal" | "full" | "none")
      router.refresh()
    } finally {
      setIsSaving(false)
    }
  }

  const handleFooterTextSave = async () => {
    setIsSaving(true)
    try {
      await updateFooterText(footerText || null)
      router.refresh()
    } finally {
      setIsSaving(false)
    }
  }

  const handlePoweredByToggle = async (checked: boolean) => {
    setShowPoweredBy(checked)
    setIsSaving(true)
    try {
      await togglePoweredBy(checked)
      router.refresh()
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <div className="grid gap-6">
      <Card>
        <CardHeader>
          <CardTitle>Navigation Style</CardTitle>
          <CardDescription>
            Choose how your website navigation appears
          </CardDescription>
        </CardHeader>
        <CardContent>
          <RadioGroup
            value={navStyle}
            onValueChange={handleNavStyleChange}
            className="grid grid-cols-3 gap-4"
            disabled={isSaving}
          >
            <div>
              <RadioGroupItem value="horizontal" id="nav-horizontal" className="peer sr-only" />
              <Label
                htmlFor="nav-horizontal"
                className="flex flex-col items-center justify-between rounded-md border-2 border-muted bg-popover p-4 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary [&:has([data-state=checked])]:border-primary cursor-pointer"
              >
                <PanelTop className="mb-3 h-6 w-6" />
                <span className="text-sm font-medium">Horizontal</span>
                <span className="text-xs text-muted-foreground">Classic top bar</span>
              </Label>
            </div>
            <div>
              <RadioGroupItem value="hamburger" id="nav-hamburger" className="peer sr-only" />
              <Label
                htmlFor="nav-hamburger"
                className="flex flex-col items-center justify-between rounded-md border-2 border-muted bg-popover p-4 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary [&:has([data-state=checked])]:border-primary cursor-pointer"
              >
                <Menu className="mb-3 h-6 w-6" />
                <span className="text-sm font-medium">Hamburger</span>
                <span className="text-xs text-muted-foreground">Collapsible menu</span>
              </Label>
            </div>
            <div>
              <RadioGroupItem value="none" id="nav-none" className="peer sr-only" />
              <Label
                htmlFor="nav-none"
                className="flex flex-col items-center justify-between rounded-md border-2 border-muted bg-popover p-4 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary [&:has([data-state=checked])]:border-primary cursor-pointer"
              >
                <EyeOff className="mb-3 h-6 w-6" />
                <span className="text-sm font-medium">None</span>
                <span className="text-xs text-muted-foreground">No navigation</span>
              </Label>
            </div>
          </RadioGroup>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Footer Style</CardTitle>
          <CardDescription>
            Choose how your website footer appears
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <RadioGroup
            value={footerStyle}
            onValueChange={handleFooterStyleChange}
            className="grid grid-cols-3 gap-4"
            disabled={isSaving}
          >
            <div>
              <RadioGroupItem value="minimal" id="footer-minimal" className="peer sr-only" />
              <Label
                htmlFor="footer-minimal"
                className="flex flex-col items-center justify-between rounded-md border-2 border-muted bg-popover p-4 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary [&:has([data-state=checked])]:border-primary cursor-pointer"
              >
                <span className="text-sm font-medium">Minimal</span>
                <span className="text-xs text-muted-foreground">Simple footer</span>
              </Label>
            </div>
            <div>
              <RadioGroupItem value="full" id="footer-full" className="peer sr-only" />
              <Label
                htmlFor="footer-full"
                className="flex flex-col items-center justify-between rounded-md border-2 border-muted bg-popover p-4 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary [&:has([data-state=checked])]:border-primary cursor-pointer"
              >
                <span className="text-sm font-medium">Full</span>
                <span className="text-xs text-muted-foreground">With links & info</span>
              </Label>
            </div>
            <div>
              <RadioGroupItem value="none" id="footer-none" className="peer sr-only" />
              <Label
                htmlFor="footer-none"
                className="flex flex-col items-center justify-between rounded-md border-2 border-muted bg-popover p-4 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary [&:has([data-state=checked])]:border-primary cursor-pointer"
              >
                <span className="text-sm font-medium">None</span>
                <span className="text-xs text-muted-foreground">No footer</span>
              </Label>
            </div>
          </RadioGroup>

          <div className="space-y-2">
            <Label>Footer Text</Label>
            <div className="flex gap-2">
              <Input
                value={footerText}
                onChange={(e) => setFooterText(e.target.value)}
                placeholder="e.g., Copyright 2024 My Company"
                className="flex-1"
              />
              <Button onClick={handleFooterTextSave} disabled={isSaving}>
                {isSaving && <Loader2 className="h-4 w-4 animate-spin" />}
                Save
              </Button>
            </div>
          </div>

          <div className="flex items-center justify-between rounded-lg border p-4">
            <div className="space-y-0.5">
              <Label className="text-base">{`Show "Powered by" badge`}</Label>
              <p className="text-sm text-muted-foreground">
                {`Display a small "Powered by axxes.club" link`}
              </p>
            </div>
            <Switch
              checked={showPoweredBy}
              onCheckedChange={handlePoweredByToggle}
              disabled={isSaving}
            />
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
