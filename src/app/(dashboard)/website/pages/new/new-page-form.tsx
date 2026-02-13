"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Switch } from "@/components/ui/switch"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form"
import { createPage } from "@/lib/actions/pages"
import { Loader2 } from "lucide-react"

const formSchema = z.object({
  title: z.string().min(1, "Title is required"),
  slug: z.string().min(1, "Slug is required").regex(/^[a-z0-9-]+$/, "Slug can only contain lowercase letters, numbers, and hyphens"),
  description: z.string().optional(),
  isHomepage: z.boolean(),
})

type FormData = z.infer<typeof formSchema>

export function NewPageForm() {
  const router = useRouter()
  const [isSubmitting, setIsSubmitting] = useState(false)

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      title: "",
      slug: "",
      description: "",
      isHomepage: false,
    },
  })

  // Auto-generate slug from title
  const handleTitleChange = (title: string) => {
    const slug = title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)/g, "")
      .substring(0, 50)
    form.setValue("slug", slug)
  }

  const onSubmit = async (data: FormData) => {
    setIsSubmitting(true)
    try {
      const page = await createPage(data)
      router.push(`/website/pages/${page.id}`)
    } catch (error) {
      console.error(error)
      form.setError("root", {
        message: error instanceof Error ? error.message : "Failed to create page",
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Page Details</CardTitle>
            <CardDescription>
              Basic information about your page
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <FormField
              control={form.control}
              name="title"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Title</FormLabel>
                  <FormControl>
                    <Input
                      {...field}
                      placeholder="e.g., About Us"
                      onChange={(e) => {
                        field.onChange(e)
                        handleTitleChange(e.target.value)
                      }}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="slug"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>URL Slug</FormLabel>
                  <FormControl>
                    <div className="flex items-center">
                      <span className="text-muted-foreground text-sm mr-2">yoursite.com/</span>
                      <Input {...field} placeholder="about-us" />
                    </div>
                  </FormControl>
                  <FormDescription>
                    The URL path for this page
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Description</FormLabel>
                  <FormControl>
                    <Textarea
                      {...field}
                      placeholder="A brief description of this page..."
                      rows={3}
                    />
                  </FormControl>
                  <FormDescription>
                    Used for SEO and page previews
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="isHomepage"
              render={({ field }) => (
                <FormItem className="flex items-center justify-between rounded-lg border p-4">
                  <div className="space-y-0.5">
                    <FormLabel className="text-base">Set as Homepage</FormLabel>
                    <FormDescription>
                      Make this the main page visitors see first
                    </FormDescription>
                  </div>
                  <FormControl>
                    <Switch
                      checked={field.value}
                      onCheckedChange={field.onChange}
                    />
                  </FormControl>
                </FormItem>
              )}
            />
          </CardContent>
        </Card>

        {form.formState.errors.root && (
          <div className="text-sm text-destructive">
            {form.formState.errors.root.message}
          </div>
        )}

        <div className="flex gap-4">
          <Button
            type="button"
            variant="outline"
            onClick={() => router.back()}
          >
            Cancel
          </Button>
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting && <Loader2 className="h-4 w-4 animate-spin" />}
            Create Page
          </Button>
        </div>
      </form>
    </Form>
  )
}
