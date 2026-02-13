"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { createPost } from "@/lib/actions/social"
import { Loader2, Instagram, Twitter, Facebook, Linkedin, Share2, AlertCircle } from "lucide-react"
import type { SocialAccount } from "@/lib/db/schema"

const formSchema = z.object({
  content: z.string().min(1, "Post content is required"),
  socialAccountId: z.string().min(1, "Select a social account"),
  mediaType: z.enum(["image", "video", "carousel", "story", "reel"]).optional(),
  scheduledFor: z.string().optional(),
  hashtags: z.string().optional(),
})

type FormData = z.infer<typeof formSchema>

interface NewPostFormProps {
  accounts: SocialAccount[]
}

function getPlatformIcon(platform: string) {
  switch (platform) {
    case "instagram":
      return <Instagram className="h-4 w-4" />
    case "twitter":
    case "x":
      return <Twitter className="h-4 w-4" />
    case "facebook":
      return <Facebook className="h-4 w-4" />
    case "linkedin":
      return <Linkedin className="h-4 w-4" />
    default:
      return <Share2 className="h-4 w-4" />
  }
}

export function NewPostForm({ accounts }: NewPostFormProps) {
  const router = useRouter()
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [submitAction, setSubmitAction] = useState<"draft" | "schedule" | "publish">("draft")

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      content: "",
      socialAccountId: accounts.length === 1 ? accounts[0].id : "",
      mediaType: undefined,
      scheduledFor: "",
      hashtags: "",
    },
  })

  const onSubmit = async (data: FormData) => {
    setIsSubmitting(true)
    try {
      const hashtags = data.hashtags
        ? data.hashtags.split(/[,\s]+/).filter(Boolean).map((h) => h.startsWith("#") ? h : `#${h}`)
        : []

      let status: "draft" | "scheduled" | "published" = "draft"
      if (submitAction === "schedule" && data.scheduledFor) {
        status = "scheduled"
      } else if (submitAction === "publish") {
        status = "published"
      }

      const post = await createPost({
        content: data.content,
        socialAccountId: data.socialAccountId,
        mediaType: data.mediaType,
        scheduledFor: data.scheduledFor || undefined,
        hashtags,
        status,
      })
      router.push(`/social/posts/${post.id}`)
    } catch (error) {
      console.error(error)
      form.setError("root", {
        message: error instanceof Error ? error.message : "Failed to create post",
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  if (accounts.length === 0) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-12">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-muted">
            <AlertCircle className="h-6 w-6 text-muted-foreground" />
          </div>
          <h3 className="mt-4 text-lg font-semibold">No connected accounts</h3>
          <p className="mt-1 text-sm text-muted-foreground text-center max-w-sm">
            You need to connect a social media account before creating posts.
          </p>
          <Link href="/social" className="mt-6">
            <Button>Connect Account</Button>
          </Link>
        </CardContent>
      </Card>
    )
  }

  const selectedAccount = accounts.find((a) => a.id === form.watch("socialAccountId"))
  const charLimit = selectedAccount?.platform === "twitter" ? 280 : 2200
  const contentLength = form.watch("content")?.length || 0

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Post Details</CardTitle>
            <CardDescription>
              Compose your social media post
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <FormField
              control={form.control}
              name="socialAccountId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Social Account</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select an account" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {accounts.map((account) => (
                        <SelectItem key={account.id} value={account.id}>
                          <div className="flex items-center gap-2">
                            {getPlatformIcon(account.platform)}
                            <span className="capitalize">{account.platform}</span>
                            {account.username && (
                              <span className="text-muted-foreground">@{account.username}</span>
                            )}
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="content"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Content</FormLabel>
                  <FormControl>
                    <Textarea
                      {...field}
                      placeholder="What do you want to share?"
                      rows={6}
                      className="resize-none"
                    />
                  </FormControl>
                  <div className="flex justify-between">
                    <FormDescription>
                      {selectedAccount ? `${selectedAccount.platform} post` : "Write your post content"}
                    </FormDescription>
                    <span className={`text-xs ${contentLength > charLimit ? "text-destructive" : "text-muted-foreground"}`}>
                      {contentLength}/{charLimit}
                    </span>
                  </div>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="hashtags"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Hashtags</FormLabel>
                  <FormControl>
                    <Input
                      {...field}
                      placeholder="e.g., music, livemusic, concert"
                    />
                  </FormControl>
                  <FormDescription>
                    Separate hashtags with commas or spaces
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="mediaType"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Media Type</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select media type (optional)" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="image">Image</SelectItem>
                      <SelectItem value="video">Video</SelectItem>
                      <SelectItem value="carousel">Carousel</SelectItem>
                      <SelectItem value="story">Story</SelectItem>
                      <SelectItem value="reel">Reel</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Scheduling</CardTitle>
            <CardDescription>
              Schedule when to publish this post
            </CardDescription>
          </CardHeader>
          <CardContent>
            <FormField
              control={form.control}
              name="scheduledFor"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Schedule Date & Time</FormLabel>
                  <FormControl>
                    <Input
                      {...field}
                      type="datetime-local"
                    />
                  </FormControl>
                  <FormDescription>
                    Leave empty to save as draft or publish immediately
                  </FormDescription>
                  <FormMessage />
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
          <Button
            type="submit"
            variant="secondary"
            disabled={isSubmitting}
            onClick={() => setSubmitAction("draft")}
          >
            {isSubmitting && submitAction === "draft" && <Loader2 className="h-4 w-4 animate-spin" />}
            Save Draft
          </Button>
          {form.watch("scheduledFor") && (
            <Button
              type="submit"
              disabled={isSubmitting}
              onClick={() => setSubmitAction("schedule")}
            >
              {isSubmitting && submitAction === "schedule" && <Loader2 className="h-4 w-4 animate-spin" />}
              Schedule
            </Button>
          )}
          <Button
            type="submit"
            disabled={isSubmitting}
            onClick={() => setSubmitAction("publish")}
          >
            {isSubmitting && submitAction === "publish" && <Loader2 className="h-4 w-4 animate-spin" />}
            Publish Now
          </Button>
        </div>
      </form>
    </Form>
  )
}
