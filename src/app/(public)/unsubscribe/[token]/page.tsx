"use client"

import { useState, useEffect } from "react"
import { useParams } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { CheckCircle, AlertCircle, Loader2 } from "lucide-react"

export default function UnsubscribePage() {
  const params = useParams()
  const token = params.token as string
  
  const [status, setStatus] = useState<"loading" | "success" | "error">("loading")
  const [reason, setReason] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)

  useEffect(() => {
    // Auto-unsubscribe on page load
    async function unsubscribe() {
      try {
        const response = await fetch("/api/newsletter/unsubscribe", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ token }),
        })

        const data = await response.json()

        if (data.success) {
          setStatus("success")
        } else {
          setStatus("error")
        }
      } catch {
        setStatus("error")
      }
    }

    if (token) {
      unsubscribe()
    }
  }, [token])

  const handleFeedbackSubmit = async () => {
    if (!reason.trim()) return
    
    setIsSubmitting(true)
    try {
      await fetch("/api/newsletter/unsubscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, reason }),
      })
    } catch {
      // Ignore feedback errors
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-muted/30">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          {status === "loading" && (
            <>
              <Loader2 className="h-12 w-12 mx-auto animate-spin text-muted-foreground" />
              <CardTitle className="mt-4">Processing...</CardTitle>
            </>
          )}
          {status === "success" && (
            <>
              <CheckCircle className="h-12 w-12 mx-auto text-green-500" />
              <CardTitle className="mt-4">Unsubscribed</CardTitle>
              <CardDescription>
                You have been successfully unsubscribed from this mailing list.
              </CardDescription>
            </>
          )}
          {status === "error" && (
            <>
              <AlertCircle className="h-12 w-12 mx-auto text-red-500" />
              <CardTitle className="mt-4">Error</CardTitle>
              <CardDescription>
                There was a problem processing your request. Please try again later.
              </CardDescription>
            </>
          )}
        </CardHeader>
        {status === "success" && (
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="reason">
                We'd love to know why you unsubscribed (optional)
              </Label>
              <Textarea
                id="reason"
                placeholder="e.g., Too many emails, not relevant anymore..."
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                rows={3}
              />
            </div>
            <Button
              className="w-full"
              onClick={handleFeedbackSubmit}
              disabled={isSubmitting || !reason.trim()}
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Submitting...
                </>
              ) : (
                "Submit Feedback"
              )}
            </Button>
          </CardContent>
        )}
      </Card>
    </div>
  )
}