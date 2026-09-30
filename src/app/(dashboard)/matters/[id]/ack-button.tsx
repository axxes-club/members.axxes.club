"use client"

import { useState, useTransition } from "react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { recordAck, bumpDocumentRevision } from "@/lib/actions/matters"

/**
 * The decision control on a document.
 *
 * "I've seen this" and "I've seen this and I object" are separate buttons, not
 * one button and a checkbox. The objection opens a text box and will not submit
 * without a reason — a disagreement with no stated ground is not something the
 * executor can act on, and letting it through would fill the record with noise.
 *
 * Nothing here ever edits a previous decision. Pressing a second button writes
 * a second row. The page shows both.
 */
export function AckButton({
  documentId,
  revision,
  canDecide,
}: {
  documentId: string
  revision: number
  canDecide: boolean
}) {
  const [open, setOpen] = useState(false)
  const [note, setNote] = useState("")
  const [pending, startTransition] = useTransition()

  function decide(decision: "viewed" | "approved" | "changes_requested" | "rejected") {
    startTransition(async () => {
      const result = await recordAck({ documentId, decision, note: note.trim() || undefined })
      if ("error" in result && result.error) {
        toast.error(result.error)
        return
      }
      toast.success(
        decision === "viewed"
          ? `Recorded against v${revision}`
          : decision === "approved"
            ? `Approved v${revision}`
            : `Your objection to v${revision} is on the record`,
      )
      setOpen(false)
      setNote("")
    })
  }

  if (!canDecide) {
    return (
      <p className="text-body-sm text-muted-foreground">
        You are watching this matter, not deciding in it.
      </p>
    )
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-2">
        <Button size="sm" variant="outline" disabled={pending} onClick={() => decide("viewed")}>
          I have seen this
        </Button>
        <Button size="sm" disabled={pending} onClick={() => decide("approved")}>
          Approve v{revision}
        </Button>
        <Button size="sm" variant="ghost" disabled={pending} onClick={() => setOpen((v) => !v)}>
          Request a change
        </Button>
      </div>

      {open && (
        <div className="space-y-2 rounded-lg border p-3">
          <Label htmlFor={`note-${documentId}`}>What needs to change?</Label>
          <Textarea
            id={`note-${documentId}`}
            rows={3}
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="Clause 7 names the wrong executor — it should be my sister."
          />
          <div className="flex gap-2">
            <Button
              size="sm"
              disabled={pending || !note.trim()}
              onClick={() => decide("changes_requested")}
            >
              Send to the record
            </Button>
            <Button size="sm" variant="ghost" disabled={pending} onClick={() => setOpen(false)}>
              Cancel
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}

export function BumpRevisionButton({ documentId }: { documentId: string }) {
  const [pending, startTransition] = useTransition()
  return (
    <Button
      size="sm"
      variant="ghost"
      disabled={pending}
      onClick={() =>
        startTransition(async () => {
          const result = await bumpDocumentRevision(documentId)
          if ("error" in result && result.error) toast.error(result.error)
          else toast.success(`Now at v${result.revision}. Earlier approvals still say which version they were given against.`)
        })
      }
    >
      {pending ? "…" : "Upload a new version"}
    </Button>
  )
}
