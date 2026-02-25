"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { createSubscriberList } from "@/lib/actions/newsletter"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Switch } from "@/components/ui/switch"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { toast } from "sonner"
import { Loader2, ArrowLeft } from "lucide-react"
import Link from "next/link"

export default function NewListPage() {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(false)
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    slug: "",
    type: "public" as "public" | "private",
    doubleOptIn: true,
  })

  // Auto-generate slug from name
  const handleNameChange = (name: string) => {
    setFormData((prev) => ({
      ...prev,
      name,
      slug: name
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-|-$/g, ""),
    }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)

    try {
      const list = await createSubscriberList(formData)
      toast.success("List created successfully")
      router.push(`/newsletter/lists/${list.id}`)
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to create list")
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" asChild>
          <Link href="/newsletter/lists">
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Create Subscriber List</h1>
          <p className="text-muted-foreground">
            Create a new list to organize your subscribers
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit}>
        <Card>
          <CardHeader>
            <CardTitle>List Details</CardTitle>
            <CardDescription>
              Basic information about your subscriber list
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Name */}
            <div className="space-y-2">
              <Label htmlFor="name">List Name *</Label>
              <Input
                id="name"
                placeholder="e.g., Newsletter Subscribers"
                value={formData.name}
                onChange={(e) => handleNameChange(e.target.value)}
                required
              />
            </div>

            {/* Description */}
            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                placeholder="Brief description of this list..."
                value={formData.description}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, description: e.target.value }))
                }
                rows={3}
              />
            </div>

            {/* Slug */}
            <div className="space-y-2">
              <Label htmlFor="slug">URL Slug *</Label>
              <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground">/subscribe/</span>
                <Input
                  id="slug"
                  placeholder="newsletter"
                  value={formData.slug}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      slug: e.target.value
                        .toLowerCase()
                        .replace(/[^a-z0-9-]/g, ""),
                    }))
                  }
                  required
                />
              </div>
              <p className="text-xs text-muted-foreground">
                Used for the public subscription URL
              </p>
            </div>

            {/* Type */}
            <div className="space-y-3">
              <Label>List Type</Label>
              <RadioGroup
                value={formData.type}
                onValueChange={(value) =>
                  setFormData((prev) => ({ ...prev, type: value as "public" | "private" }))
                }
              >
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="public" id="public" />
                  <Label htmlFor="public" className="font-normal">
                    Public - Anyone can subscribe via the subscription form
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="private" id="private" />
                  <Label htmlFor="private" className="font-normal">
                    Private - Only admins can add subscribers
                  </Label>
                </div>
              </RadioGroup>
            </div>

            {/* Double Opt-in */}
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="doubleOptIn">Double Opt-in</Label>
                <p className="text-sm text-muted-foreground">
                  Require subscribers to confirm their email address
                </p>
              </div>
              <Switch
                id="doubleOptIn"
                checked={formData.doubleOptIn}
                onCheckedChange={(checked) =>
                  setFormData((prev) => ({ ...prev, doubleOptIn: checked }))
                }
              />
            </div>
          </CardContent>
        </Card>

        <div className="flex justify-end gap-4 mt-6">
          <Button variant="outline" type="button" asChild>
            <Link href="/newsletter/lists">Cancel</Link>
          </Button>
          <Button type="submit" disabled={isLoading || !formData.name || !formData.slug}>
            {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Create List
          </Button>
        </div>
      </form>
    </div>
  )
}