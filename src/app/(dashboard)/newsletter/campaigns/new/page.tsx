"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { createCampaign, getSubscriberLists, getEmailTemplates } from "@/lib/actions/newsletter"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Checkbox } from "@/components/ui/checkbox"
import { Badge } from "@/components/ui/badge"
import { toast } from "sonner"
import { Loader2, ArrowLeft, ArrowRight, Mail, Settings, Users, Eye } from "lucide-react"
import Link from "next/link"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"

type List = { id: string; name: string; subscriberCount: number | null }
type Template = { id: string; name: string; subject: string }

export default function NewCampaignPage() {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(false)
  const [lists, setLists] = useState<List[]>([])
  const [templates, setTemplates] = useState<Template[]>([])
  const [step, setStep] = useState(1)
  const [formData, setFormData] = useState({
    name: "",
    subject: "",
    previewText: "",
    htmlContent: "",
    textContent: "",
    templateId: "",
    fromName: "",
    fromEmail: "",
    replyTo: "",
    listIds: [] as string[],
    trackingEnabled: true,
    clickTrackingEnabled: true,
    openTrackingEnabled: true,
  })

  useEffect(() => {
    async function loadData() {
      try {
        const [listsData, templatesData] = await Promise.all([
          getSubscriberLists(),
          getEmailTemplates(),
        ])
        setLists(listsData)
        setTemplates(templatesData)
      } catch (error) {
        toast.error("Failed to load data")
      }
    }
    loadData()
  }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)

    try {
      const campaign = await createCampaign({
        ...formData,
        templateId: formData.templateId || undefined,
        listIds: formData.listIds.length > 0 ? formData.listIds : undefined,
      })
      toast.success("Campaign created successfully")
      router.push(`/newsletter/campaigns/${campaign.id}`)
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to create campaign")
    } finally {
      setIsLoading(false)
    }
  }

  const toggleList = (listId: string) => {
    setFormData((prev) => ({
      ...prev,
      listIds: prev.listIds.includes(listId)
        ? prev.listIds.filter((id) => id !== listId)
        : [...prev.listIds, listId],
    }))
  }

  const handleTemplateSelect = (templateId: string) => {
    const template = templates.find((t) => t.id === templateId)
    if (template) {
      setFormData((prev) => ({
        ...prev,
        templateId,
        subject: prev.subject || template.subject,
      }))
    } else {
      setFormData((prev) => ({ ...prev, templateId: "" }))
    }
  }

  const totalRecipients = lists
    .filter((l) => formData.listIds.includes(l.id))
    .reduce((sum, l) => sum + (l.subscriberCount ?? 0), 0)

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" asChild>
          <Link href="/newsletter/campaigns">
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <div>
          <h1 className="text-3xl font-bold tracking-tight">New Campaign</h1>
          <p className="text-muted-foreground">
            Create a new email campaign
          </p>
        </div>
      </div>

      {/* Steps */}
      <div className="flex items-center gap-2">
        {[1, 2, 3].map((s) => (
          <div
            key={s}
            className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm ${
              step >= s
                ? "bg-primary text-primary-foreground"
                : "bg-muted text-muted-foreground"
            }`}
          >
            {s === 1 && <Mail className="h-4 w-4" />}
            {s === 2 && <Eye className="h-4 w-4" />}
            {s === 3 && <Users className="h-4 w-4" />}
            <span>
              {s === 1 ? "Details" : s === 2 ? "Content" : "Recipients"}
            </span>
          </div>
        ))}
      </div>

      <form onSubmit={handleSubmit}>
        {/* Step 1: Details */}
        {step === 1 && (
          <Card>
            <CardHeader>
              <CardTitle>Campaign Details</CardTitle>
              <CardDescription>
                Basic information about your campaign
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="name">Campaign Name *</Label>
                <Input
                  id="name"
                  placeholder="e.g., February Newsletter"
                  value={formData.name}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, name: e.target.value }))
                  }
                  required
                />
                <p className="text-xs text-muted-foreground">
                  This is for internal reference only
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="subject">Email Subject *</Label>
                <Input
                  id="subject"
                  placeholder="Your monthly update"
                  value={formData.subject}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, subject: e.target.value }))
                  }
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="previewText">Preview Text</Label>
                <Input
                  id="previewText"
                  placeholder="Short preview shown in inbox"
                  value={formData.previewText}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, previewText: e.target.value }))
                  }
                />
                <p className="text-xs text-muted-foreground">
                  This appears next to the subject line in some email clients
                </p>
              </div>

              <div className="grid gap-4 md:grid-cols-3">
                <div className="space-y-2">
                  <Label htmlFor="fromName">From Name</Label>
                  <Input
                    id="fromName"
                    placeholder="Your Brand"
                    value={formData.fromName}
                    onChange={(e) =>
                      setFormData((prev) => ({ ...prev, fromName: e.target.value }))
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="fromEmail">From Email</Label>
                  <Input
                    id="fromEmail"
                    type="email"
                    placeholder="newsletter@yourbrand.com"
                    value={formData.fromEmail}
                    onChange={(e) =>
                      setFormData((prev) => ({ ...prev, fromEmail: e.target.value }))
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="replyTo">Reply-To</Label>
                  <Input
                    id="replyTo"
                    type="email"
                    placeholder="replies@yourbrand.com"
                    value={formData.replyTo}
                    onChange={(e) =>
                      setFormData((prev) => ({ ...prev, replyTo: e.target.value }))
                    }
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Step 2: Content */}
        {step === 2 && (
          <Card>
            <CardHeader>
              <CardTitle>Email Content</CardTitle>
              <CardDescription>
                Design your email message
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Template Selection */}
              <div className="space-y-2">
                <Label>Start from Template</Label>
                <Select value={formData.templateId} onValueChange={handleTemplateSelect}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select a template (optional)" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">No template</SelectItem>
                    {templates.map((template) => (
                      <SelectItem key={template.id} value={template.id}>
                        {template.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Content Tabs */}
              <Tabs defaultValue="html">
                <TabsList>
                  <TabsTrigger value="html">HTML</TabsTrigger>
                  <TabsTrigger value="text">Plain Text</TabsTrigger>
                </TabsList>
                <TabsContent value="html" className="mt-4">
                  <div className="space-y-2">
                    <Label htmlFor="htmlContent">HTML Content</Label>
                    <Textarea
                      id="htmlContent"
                      placeholder="<html>...</html>"
                      value={formData.htmlContent}
                      onChange={(e) =>
                        setFormData((prev) => ({ ...prev, htmlContent: e.target.value }))
                      }
                      className="font-mono min-h-[400px]"
                    />
                  </div>
                </TabsContent>
                <TabsContent value="text" className="mt-4">
                  <div className="space-y-2">
                    <Label htmlFor="textContent">Plain Text Content</Label>
                    <Textarea
                      id="textContent"
                      placeholder="Plain text version of your email..."
                      value={formData.textContent}
                      onChange={(e) =>
                        setFormData((prev) => ({ ...prev, textContent: e.target.value }))
                      }
                      className="min-h-[400px]"
                    />
                    <p className="text-xs text-muted-foreground">
                      A plain text version improves deliverability
                    </p>
                  </div>
                </TabsContent>
              </Tabs>

              {/* Tracking Options */}
              <div className="space-y-4 pt-4 border-t">
                <h4 className="font-medium">Tracking Options</h4>
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label htmlFor="trackingEnabled">Enable Tracking</Label>
                      <p className="text-sm text-muted-foreground">
                        Track opens and clicks for this campaign
                      </p>
                    </div>
                    <Checkbox
                      id="trackingEnabled"
                      checked={formData.trackingEnabled}
                      onCheckedChange={(checked) =>
                        setFormData((prev) => ({ ...prev, trackingEnabled: !!checked }))
                      }
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label>Open Tracking</Label>
                      <p className="text-sm text-muted-foreground">
                        Track when recipients open your email
                      </p>
                    </div>
                    <Checkbox
                      checked={formData.openTrackingEnabled}
                      onCheckedChange={(checked) =>
                        setFormData((prev) => ({ ...prev, openTrackingEnabled: !!checked }))
                      }
                      disabled={!formData.trackingEnabled}
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label>Click Tracking</Label>
                      <p className="text-sm text-muted-foreground">
                        Track when recipients click links
                      </p>
                    </div>
                    <Checkbox
                      checked={formData.clickTrackingEnabled}
                      onCheckedChange={(checked) =>
                        setFormData((prev) => ({ ...prev, clickTrackingEnabled: !!checked }))
                      }
                      disabled={!formData.trackingEnabled}
                    />
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Step 3: Recipients */}
        {step === 3 && (
          <Card>
            <CardHeader>
              <CardTitle>Select Recipients</CardTitle>
              <CardDescription>
                Choose which subscriber lists to send to
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {lists.length === 0 ? (
                <div className="text-center py-8">
                  <Users className="h-12 w-12 mx-auto text-muted-foreground/50" />
                  <p className="mt-4 text-muted-foreground">
                    No lists available. Create a list first to send campaigns.
                  </p>
                  <Button className="mt-4" variant="outline" asChild>
                    <Link href="/newsletter/lists/new">Create List</Link>
                  </Button>
                </div>
              ) : (
                <>
                  <div className="space-y-4">
                    {lists.map((list) => (
                      <div
                        key={list.id}
                        className={`flex items-center justify-between rounded-lg border p-4 cursor-pointer transition-colors ${
                          formData.listIds.includes(list.id)
                            ? "border-primary bg-primary/5"
                            : "hover:bg-muted/50"
                        }`}
                        onClick={() => toggleList(list.id)}
                      >
                        <div className="flex items-center gap-4">
                          <Checkbox
                            checked={formData.listIds.includes(list.id)}
                            onCheckedChange={() => toggleList(list.id)}
                          />
                          <div>
                            <p className="font-medium">{list.name}</p>
                            <p className="text-sm text-muted-foreground">
                              {list.subscriberCount ?? 0} subscribers
                            </p>
                          </div>
                        </div>
                        {formData.listIds.includes(list.id) && (
                          <Badge variant="secondary">Selected</Badge>
                        )}
                      </div>
                    ))}
                  </div>

                  {formData.listIds.length > 0 && (
                    <div className="flex items-center justify-between p-4 bg-muted rounded-lg">
                      <span className="font-medium">Total Recipients</span>
                      <span className="text-2xl font-bold">
                        {totalRecipients.toLocaleString()}
                      </span>
                    </div>
                  )}
                </>
              )}
            </CardContent>
          </Card>
        )}

        {/* Navigation */}
        <div className="flex justify-between mt-6">
          <Button
            variant="outline"
            type="button"
            onClick={() => setStep((s) => Math.max(1, s - 1))}
            disabled={step === 1}
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Previous
          </Button>

          {step < 3 ? (
            <Button
              type="button"
              onClick={() => setStep((s) => s + 1)}
              disabled={
                (step === 1 && (!formData.name || !formData.subject)) ||
                (step === 2 && !formData.htmlContent)
              }
            >
              Next
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          ) : (
            <Button
              type="submit"
              disabled={isLoading || formData.listIds.length === 0}
            >
              {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Create Campaign
            </Button>
          )}
        </div>
      </form>
    </div>
  )
}