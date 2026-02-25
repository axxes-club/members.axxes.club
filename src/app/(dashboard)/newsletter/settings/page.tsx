"use client"

import { useState, useEffect } from "react"
import { getNewsletterSettings, updateNewsletterSettings } from "@/lib/actions/newsletter"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
import { toast } from "sonner"
import { Loader2, Save, Settings } from "lucide-react"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"

type EmailProvider = "smtp" | "resend" | "sendgrid" | "mailgun"

export default function NewsletterSettingsPage() {
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [settings, setSettings] = useState<{
    emailProvider: EmailProvider
    defaultFromName: string
    defaultFromEmail: string
    defaultReplyTo: string
    resendApiKey: string
    sendgridApiKey: string
    mailgunApiKey: string
    mailgunDomain: string
    smtpHost: string
    smtpPort: number
    smtpUser: string
    smtpPassword: string
    smtpSecure: boolean
    openTrackingEnabled: boolean
    clickTrackingEnabled: boolean
    logoUrl: string
    brandColor: string
  }>({
    emailProvider: "smtp",
    defaultFromName: "",
    defaultFromEmail: "",
    defaultReplyTo: "",
    resendApiKey: "",
    sendgridApiKey: "",
    mailgunApiKey: "",
    mailgunDomain: "",
    smtpHost: "",
    smtpPort: 587,
    smtpUser: "",
    smtpPassword: "",
    smtpSecure: true,
    openTrackingEnabled: true,
    clickTrackingEnabled: true,
    logoUrl: "",
    brandColor: "",
  })

  useEffect(() => {
    async function loadSettings() {
      try {
        const data = await getNewsletterSettings()
        setSettings({
          emailProvider: (data.emailProvider as EmailProvider) || "smtp",
          defaultFromName: data.defaultFromName || "",
          defaultFromEmail: data.defaultFromEmail || "",
          defaultReplyTo: data.defaultReplyTo || "",
          resendApiKey: data.resendApiKey || "",
          sendgridApiKey: data.sendgridApiKey || "",
          mailgunApiKey: data.mailgunApiKey || "",
          mailgunDomain: data.mailgunDomain || "",
          smtpHost: data.smtpHost || "",
          smtpPort: data.smtpPort || 587,
          smtpUser: data.smtpUser || "",
          smtpPassword: data.smtpPassword || "",
          smtpSecure: data.smtpSecure ?? true,
          openTrackingEnabled: data.openTrackingEnabled ?? true,
          clickTrackingEnabled: data.clickTrackingEnabled ?? true,
          logoUrl: data.logoUrl || "",
          brandColor: data.brandColor || "",
        })
      } catch (error) {
        toast.error("Failed to load settings")
      } finally {
        setIsLoading(false)
      }
    }
    loadSettings()
  }, [])

  const handleSave = async () => {
    setIsSaving(true)
    try {
      await updateNewsletterSettings(settings)
      toast.success("Settings saved successfully")
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to save settings")
    } finally {
      setIsSaving(false)
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Newsletter Settings</h1>
          <p className="text-muted-foreground">
            Configure your email provider and sending settings
          </p>
        </div>
        <Button onClick={handleSave} disabled={isSaving}>
          {isSaving ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Saving...
            </>
          ) : (
            <>
              <Save className="mr-2 h-4 w-4" />
              Save Settings
            </>
          )}
        </Button>
      </div>

      <Tabs defaultValue="provider">
        <TabsList>
          <TabsTrigger value="provider">Email Provider</TabsTrigger>
          <TabsTrigger value="defaults">Default Settings</TabsTrigger>
          <TabsTrigger value="tracking">Tracking</TabsTrigger>
          <TabsTrigger value="branding">Branding</TabsTrigger>
        </TabsList>

        {/* Email Provider Tab */}
        <TabsContent value="provider" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Email Provider</CardTitle>
              <CardDescription>
                Choose your email sending provider
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-2">
                <Label>Provider</Label>
                <Select
                  value={settings.emailProvider}
                  onValueChange={(value: EmailProvider) =>
                    setSettings((prev) => ({ ...prev, emailProvider: value }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="smtp">SMTP</SelectItem>
                    <SelectItem value="resend">Resend</SelectItem>
                    <SelectItem value="sendgrid">SendGrid</SelectItem>
                    <SelectItem value="mailgun">Mailgun</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* SMTP Settings */}
              {settings.emailProvider === "smtp" && (
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="smtpHost">SMTP Host</Label>
                    <Input
                      id="smtpHost"
                      placeholder="smtp.gmail.com"
                      value={settings.smtpHost}
                      onChange={(e) =>
                        setSettings((prev) => ({ ...prev, smtpHost: e.target.value }))
                      }
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="smtpPort">Port</Label>
                    <Input
                      id="smtpPort"
                      type="number"
                      placeholder="587"
                      value={settings.smtpPort}
                      onChange={(e) =>
                        setSettings((prev) => ({ ...prev, smtpPort: parseInt(e.target.value) || 587 }))
                      }
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="smtpUser">Username</Label>
                    <Input
                      id="smtpUser"
                      placeholder="your-email@gmail.com"
                      value={settings.smtpUser}
                      onChange={(e) =>
                        setSettings((prev) => ({ ...prev, smtpUser: e.target.value }))
                      }
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="smtpPassword">Password</Label>
                    <Input
                      id="smtpPassword"
                      type="password"
                      placeholder="••••••••"
                      value={settings.smtpPassword}
                      onChange={(e) =>
                        setSettings((prev) => ({ ...prev, smtpPassword: e.target.value }))
                      }
                    />
                  </div>
                  <div className="flex items-center gap-2 md:col-span-2">
                    <Switch
                      id="smtpSecure"
                      checked={settings.smtpSecure}
                      onCheckedChange={(checked) =>
                        setSettings((prev) => ({ ...prev, smtpSecure: checked }))
                      }
                    />
                    <Label htmlFor="smtpSecure">Use SSL/TLS</Label>
                  </div>
                </div>
              )}

              {/* Resend Settings */}
              {settings.emailProvider === "resend" && (
                <div className="space-y-2">
                  <Label htmlFor="resendApiKey">Resend API Key</Label>
                  <Input
                    id="resendApiKey"
                    type="password"
                    placeholder="re_..."
                    value={settings.resendApiKey}
                    onChange={(e) =>
                      setSettings((prev) => ({ ...prev, resendApiKey: e.target.value }))
                    }
                  />
                  <p className="text-xs text-muted-foreground">
                    Get your API key from{" "}
                    <a
                      href="https://resend.com/api-keys"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-primary hover:underline"
                    >
                      resend.com/api-keys
                    </a>
                  </p>
                </div>
              )}

              {/* SendGrid Settings */}
              {settings.emailProvider === "sendgrid" && (
                <div className="space-y-2">
                  <Label htmlFor="sendgridApiKey">SendGrid API Key</Label>
                  <Input
                    id="sendgridApiKey"
                    type="password"
                    placeholder="SG..."
                    value={settings.sendgridApiKey}
                    onChange={(e) =>
                      setSettings((prev) => ({ ...prev, sendgridApiKey: e.target.value }))
                    }
                  />
                </div>
              )}

              {/* Mailgun Settings */}
              {settings.emailProvider === "mailgun" && (
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="mailgunApiKey">Mailgun API Key</Label>
                    <Input
                      id="mailgunApiKey"
                      type="password"
                      placeholder="key-..."
                      value={settings.mailgunApiKey}
                      onChange={(e) =>
                        setSettings((prev) => ({ ...prev, mailgunApiKey: e.target.value }))
                      }
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="mailgunDomain">Domain</Label>
                    <Input
                      id="mailgunDomain"
                      placeholder="mg.yourdomain.com"
                      value={settings.mailgunDomain}
                      onChange={(e) =>
                        setSettings((prev) => ({ ...prev, mailgunDomain: e.target.value }))
                      }
                    />
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Default Settings Tab */}
        <TabsContent value="defaults" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Default Sender Settings</CardTitle>
              <CardDescription>
                Default values for new campaigns
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="defaultFromName">From Name</Label>
                  <Input
                    id="defaultFromName"
                    placeholder="Your Brand"
                    value={settings.defaultFromName}
                    onChange={(e) =>
                      setSettings((prev) => ({ ...prev, defaultFromName: e.target.value }))
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="defaultFromEmail">From Email</Label>
                  <Input
                    id="defaultFromEmail"
                    type="email"
                    placeholder="newsletter@yourbrand.com"
                    value={settings.defaultFromEmail}
                    onChange={(e) =>
                      setSettings((prev) => ({ ...prev, defaultFromEmail: e.target.value }))
                    }
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="defaultReplyTo">Reply-To Email</Label>
                <Input
                  id="defaultReplyTo"
                  type="email"
                  placeholder="replies@yourbrand.com"
                  value={settings.defaultReplyTo}
                  onChange={(e) =>
                    setSettings((prev) => ({ ...prev, defaultReplyTo: e.target.value }))
                  }
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tracking Tab */}
        <TabsContent value="tracking" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Tracking Settings</CardTitle>
              <CardDescription>
                Configure email tracking options
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Open Tracking</Label>
                  <p className="text-sm text-muted-foreground">
                    Track when recipients open your emails
                  </p>
                </div>
                <Switch
                  checked={settings.openTrackingEnabled}
                  onCheckedChange={(checked) =>
                    setSettings((prev) => ({ ...prev, openTrackingEnabled: checked }))
                  }
                />
              </div>
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Click Tracking</Label>
                  <p className="text-sm text-muted-foreground">
                    Track when recipients click links in your emails
                  </p>
                </div>
                <Switch
                  checked={settings.clickTrackingEnabled}
                  onCheckedChange={(checked) =>
                    setSettings((prev) => ({ ...prev, clickTrackingEnabled: checked }))
                  }
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Branding Tab */}
        <TabsContent value="branding" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Branding</CardTitle>
              <CardDescription>
                Customize the look of public newsletter pages
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="logoUrl">Logo URL</Label>
                <Input
                  id="logoUrl"
                  type="url"
                  placeholder="https://yourbrand.com/logo.png"
                  value={settings.logoUrl}
                  onChange={(e) =>
                    setSettings((prev) => ({ ...prev, logoUrl: e.target.value }))
                  }
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="brandColor">Brand Color</Label>
                <div className="flex gap-2">
                  <Input
                    id="brandColor"
                    type="color"
                    className="w-16 h-10 p-1"
                    value={settings.brandColor || "#000000"}
                    onChange={(e) =>
                      setSettings((prev) => ({ ...prev, brandColor: e.target.value }))
                    }
                  />
                  <Input
                    type="text"
                    placeholder="#000000"
                    value={settings.brandColor}
                    onChange={(e) =>
                      setSettings((prev) => ({ ...prev, brandColor: e.target.value }))
                    }
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}