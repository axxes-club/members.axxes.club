"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { createInviteCode } from "@/lib/actions/admin"
import { Plus } from "lucide-react"

export function CreateInviteCodeForm() {
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setLoading(true)
    setError(null)

    const formData = new FormData(e.currentTarget)
    const code = formData.get("code") as string
    const maxUsesStr = formData.get("maxUses") as string
    const maxUses = maxUsesStr ? parseInt(maxUsesStr, 10) : undefined

    try {
      await createInviteCode(code, maxUses)
      setOpen(false)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create invite code")
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <Plus className="h-4 w-4 mr-2" />
          Add Code
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Create Invite Code</DialogTitle>
          <DialogDescription>
            Create a new invite code for user registration
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
              {error}
            </div>
          )}
          <div className="space-y-2">
            <Label htmlFor="code">Code</Label>
            <Input
              id="code"
              name="code"
              placeholder="MYCODE2026"
              className="uppercase"
              required
            />
            <p className="text-xs text-muted-foreground">
              Will be converted to uppercase automatically
            </p>
          </div>
          <div className="space-y-2">
            <Label htmlFor="maxUses">Max Uses (optional)</Label>
            <Input
              id="maxUses"
              name="maxUses"
              type="number"
              min="1"
              placeholder="Unlimited"
            />
            <p className="text-xs text-muted-foreground">
              Leave empty for unlimited uses
            </p>
          </div>
          <div className="flex justify-end gap-3">
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
              disabled={loading}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? "Creating..." : "Create Code"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
