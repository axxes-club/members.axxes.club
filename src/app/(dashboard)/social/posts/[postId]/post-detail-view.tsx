"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
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
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import { updatePost, deletePost, publishPost, schedulePost } from "@/lib/actions/social"
import { Loader2, Trash2, Instagram, Twitter, Facebook, Linkedin, Share2, ExternalLink, Clock, CheckCircle, AlertCircle } from "lucide-react"
import { format } from "date-fns"
import type { SocialPost, SocialAccount, SocialPostAnalytics } from "@/lib/db/schema"

const formSchema = z.object({
  content: z.string().min(1, "Post content is required"),
  socialAccountId: z.string().min(1, "Select a social account"),
  mediaType: z.enum(["image", "video", "carousel", "story", "reel"]).optional(),
  scheduledFor: z.string().optional(),
  hashtags: z.string().optional(),
})

type FormData = z.infer<typeof formSchema>

interface PostDetailViewProps {
  post: SocialPost & {
    socialAccount: SocialAccount | null
    analytics: SocialPostAnalytics[]
  }
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

function getStatusBadge(status: string) {
  switch (status) {
    case "draft":
      return <Badge variant="secondary">Draft</Badge>
    case "scheduled":
      return <Badge variant="outline">Scheduled</Badge>
    case "published":
      return <Badge variant="success">Published</Badge>
    case "failed":
      return <Badge variant="destructive">Failed</Badge>
    default:
      return <Badge variant="secondary">{status}</Badge>
  }
}

export function PostDetailView({ post, accounts }: PostDetailViewProps) {
  const router = useRouter()
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const [isPublishing, setIsPublishing] = useState(false)

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      content: post.content || "",
      socialAccountId: post.socialAccountId,
      mediaType: post.mediaType || undefined,
      scheduledFor: post.scheduledFor
        ? format(new Date(post.scheduledFor), "yyyy-MM-dd'T'HH:mm")
        : "",
      hashtags: post.hashtags?.join(", ") || "",
    },
  })

  const isEditable = post.status === "draft" || post.status === "scheduled"

  const onSubmit = async (data: FormData) => {
    setIsSubmitting(true)
    try {
      const hashtags = data.hashtags
        ? data.hashtags.split(/[,\s]+/).filter(Boolean).map((h) => h.startsWith("#") ? h : `#${h}`)
        : []

      await updatePost(post.id, {
        content: data.content,
        socialAccountId: data.socialAccountId,
        mediaType: data.mediaType,
        scheduledFor: data.scheduledFor || undefined,
        hashtags,
      })
      router.refresh()
    } catch (error) {
      console.error(error)
      form.setError("root", {
        message: error instanceof Error ? error.message : "Failed to update post",
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleDelete = async () => {
    setIsDeleting(true)
    try {
      await deletePost(post.id)
      router.push("/social/posts")
    } catch (error) {
      console.error(error)
      alert(error instanceof Error ? error.message : "Failed to delete post")
    } finally {
      setIsDeleting(false)
    }
  }

  const handlePublish = async () => {
    setIsPublishing(true)
    try {
      await publishPost(post.id)
      router.refresh()
    } catch (error) {
      console.error(error)
      alert(error instanceof Error ? error.message : "Failed to publish post")
    } finally {
      setIsPublishing(false)
    }
  }

  const handleSchedule = async () => {
    const scheduledFor = form.getValues("scheduledFor")
    if (!scheduledFor) {
      form.setError("scheduledFor", { message: "Please select a date and time" })
      return
    }
    setIsSubmitting(true)
    try {
      await schedulePost(post.id, scheduledFor)
      router.refresh()
    } catch (error) {
      console.error(error)
      alert(error instanceof Error ? error.message : "Failed to schedule post")
    } finally {
      setIsSubmitting(false)
    }
  }

  const selectedAccount = accounts.find((a) => a.id === form.watch("socialAccountId"))
  const charLimit = selectedAccount?.platform === "twitter" ? 280 : 2200
  const contentLength = form.watch("content")?.length || 0

  const latestAnalytics = post.analytics?.[0]

  return (
    <div className="grid gap-8 lg:grid-cols-3">
      <div className="lg:col-span-2 space-y-6">
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle>Post Details</CardTitle>
                  {getStatusBadge(post.status)}
                </div>
                <CardDescription>
                  {isEditable ? "Edit your post content" : "This post has been published and cannot be edited"}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <FormField
                  control={form.control}
                  name="socialAccountId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Social Account</FormLabel>
                      <Select
                        onValueChange={field.onChange}
                        defaultValue={field.value}
                        disabled={!isEditable}
                      >
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
                          disabled={!isEditable}
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
                          disabled={!isEditable}
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
                      <Select
                        onValueChange={field.onChange}
                        defaultValue={field.value}
                        disabled={!isEditable}
                      >
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

            {isEditable && (
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
                          Leave empty for immediate publishing
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </CardContent>
              </Card>
            )}

            {form.formState.errors.root && (
              <div className="text-sm text-destructive">
                {form.formState.errors.root.message}
              </div>
            )}

            <div className="flex flex-wrap gap-4">
              {isEditable && (
                <>
                  <Button type="submit" disabled={isSubmitting}>
                    {isSubmitting && <Loader2 className="h-4 w-4 animate-spin" />}
                    Save Changes
                  </Button>
                  {post.status === "draft" && form.watch("scheduledFor") && (
                    <Button
                      type="button"
                      variant="secondary"
                      onClick={handleSchedule}
                      disabled={isSubmitting}
                    >
                      <Clock className="h-4 w-4" />
                      Schedule
                    </Button>
                  )}
                  {post.status === "draft" && (
                    <Button
                      type="button"
                      onClick={handlePublish}
                      disabled={isPublishing}
                    >
                      {isPublishing ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <CheckCircle className="h-4 w-4" />
                      )}
                      Publish Now
                    </Button>
                  )}
                </>
              )}
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button type="button" variant="destructive" disabled={isDeleting}>
                    {isDeleting ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Trash2 className="h-4 w-4" />
                    )}
                    Delete Post
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Delete Post</AlertDialogTitle>
                    <AlertDialogDescription>
                      Are you sure you want to delete this post? This action cannot be undone.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction
                      onClick={handleDelete}
                      className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                    >
                      Delete
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>
          </form>
        </Form>
      </div>

      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Post Info</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <p className="text-sm font-medium">Status</p>
              <div className="mt-1">{getStatusBadge(post.status)}</div>
            </div>
            {post.socialAccount && (
              <div>
                <p className="text-sm font-medium">Account</p>
                <div className="flex items-center gap-2 mt-1">
                  {getPlatformIcon(post.socialAccount.platform)}
                  <span className="capitalize">{post.socialAccount.platform}</span>
                  {post.socialAccount.username && (
                    <span className="text-muted-foreground">@{post.socialAccount.username}</span>
                  )}
                </div>
              </div>
            )}
            {post.scheduledFor && (
              <div>
                <p className="text-sm font-medium">Scheduled For</p>
                <p className="text-sm text-muted-foreground mt-1">
                  {format(new Date(post.scheduledFor), "MMM d, yyyy 'at' h:mm a")}
                </p>
              </div>
            )}
            {post.publishedAt && (
              <div>
                <p className="text-sm font-medium">Published At</p>
                <p className="text-sm text-muted-foreground mt-1">
                  {format(new Date(post.publishedAt), "MMM d, yyyy 'at' h:mm a")}
                </p>
              </div>
            )}
            <div>
              <p className="text-sm font-medium">Created</p>
              <p className="text-sm text-muted-foreground mt-1">
                {format(new Date(post.createdAt), "MMM d, yyyy 'at' h:mm a")}
              </p>
            </div>
            {post.platformUrl && (
              <div>
                <a
                  href={post.platformUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 text-sm text-primary hover:underline"
                >
                  <ExternalLink className="h-4 w-4" />
                  View on {post.socialAccount?.platform || "platform"}
                </a>
              </div>
            )}
          </CardContent>
        </Card>

        {post.status === "failed" && post.errorMessage && (
          <Card className="border-destructive">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-destructive">
                <AlertCircle className="h-4 w-4" />
                Error
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">{post.errorMessage}</p>
              {post.retryCount && post.retryCount > 0 && (
                <p className="text-xs text-muted-foreground mt-2">
                  Retry attempts: {post.retryCount}
                </p>
              )}
            </CardContent>
          </Card>
        )}

        {latestAnalytics && (
          <Card>
            <CardHeader>
              <CardTitle>Analytics</CardTitle>
              <CardDescription>
                Latest performance metrics
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-2xl font-bold">{latestAnalytics.impressions}</p>
                  <p className="text-xs text-muted-foreground">Impressions</p>
                </div>
                <div>
                  <p className="text-2xl font-bold">{latestAnalytics.reach}</p>
                  <p className="text-xs text-muted-foreground">Reach</p>
                </div>
                <div>
                  <p className="text-2xl font-bold">{latestAnalytics.likes}</p>
                  <p className="text-xs text-muted-foreground">Likes</p>
                </div>
                <div>
                  <p className="text-2xl font-bold">{latestAnalytics.comments}</p>
                  <p className="text-xs text-muted-foreground">Comments</p>
                </div>
                <div>
                  <p className="text-2xl font-bold">{latestAnalytics.shares}</p>
                  <p className="text-xs text-muted-foreground">Shares</p>
                </div>
                <div>
                  <p className="text-2xl font-bold">{latestAnalytics.saves}</p>
                  <p className="text-xs text-muted-foreground">Saves</p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}
