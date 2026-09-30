"use client"

import { useState, useTransition } from "react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { addDocument, addParticipant, addTask, addDeadline, toggleTask } from "@/lib/actions/matters"

/** Adds a document to the matter. */
export function AddDocumentForm({ matterId }: { matterId: string }) {
  const [title, setTitle] = useState("")
  const [purpose, setPurpose] = useState("")
  const [pending, start] = useTransition()

  return (
    <form
      className="flex flex-col gap-2 sm:flex-row"
      onSubmit={(e) => {
        e.preventDefault()
        if (!title.trim()) return
        start(async () => {
          const r = await addDocument({
            matterId,
            title: title.trim(),
            kind: "asset",
            purpose: purpose.trim() || undefined,
          })
          if ("error" in r && r.error) {
            toast.error(r.error)
            return
          }
          toast.success("Added. It starts at v1, with nobody's name on it yet.")
          setTitle("")
          setPurpose("")
        })
      }}
    >
      <input
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        placeholder="Last will and testament"
        className="h-9 flex-1 rounded-md border border-input bg-background px-3 text-sm"
      />
      <input
        value={purpose}
        onChange={(e) => setPurpose(e.target.value)}
        placeholder="What it settles (optional)"
        className="h-9 flex-1 rounded-md border border-input bg-background px-3 text-sm"
      />
      <Button size="sm" type="submit" disabled={pending}>Add</Button>
    </form>
  )
}

/** Adds a task with somebody's name against it. */
export function AddTaskForm({
  matterId,
  people,
}: {
  matterId: string
  people: { actorKey: string | null; displayName: string }[]
}) {
  const [title, setTitle] = useState("")
  const [assignee, setAssignee] = useState("")
  const [pending, start] = useTransition()

  return (
    <form
      className="flex flex-col gap-2 sm:flex-row"
      onSubmit={(e) => {
        e.preventDefault()
        if (!title.trim()) return
        const person = people.find((p) => p.displayName === assignee)
        start(async () => {
          const r = await addTask({
            matterId,
            title: title.trim(),
            actorKey: person?.actorKey ?? undefined,
            actorName: person?.displayName ?? undefined,
          })
          if ("error" in r && r.error) {
            toast.error(r.error)
            return
          }
          toast.success("Added")
          setTitle("")
        })
      }}
    >
      <input
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        placeholder="Send Rosa the birth certificates"
        className="h-9 flex-1 rounded-md border border-input bg-background px-3 text-sm"
      />
      <select
        value={assignee}
        onChange={(e) => setAssignee(e.target.value)}
        className="h-9 rounded-md border border-input bg-background px-3 text-sm"
      >
        <option value="">Nobody yet</option>
        {people.map((p) => (
          <option key={p.displayName} value={p.displayName}>{p.displayName}</option>
        ))}
      </select>
      <Button size="sm" type="submit" disabled={pending}>Add</Button>
    </form>
  )
}

/** Adds a deadline. */
export function AddDeadlineForm({ matterId }: { matterId: string }) {
  const [title, setTitle] = useState("")
  const [dueAt, setDueAt] = useState("")
  const [pending, start] = useTransition()

  return (
    <form
      className="flex flex-col gap-2 sm:flex-row"
      onSubmit={(e) => {
        e.preventDefault()
        if (!title.trim() || !dueAt) return
        start(async () => {
          const r = await addDeadline({ matterId, title: title.trim(), kind: "other", dueAt })
          if ("error" in r && r.error) {
            toast.error(r.error)
            return
          }
          toast.success("Added")
          setTitle("")
          setDueAt("")
        })
      }}
    >
      <input
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        placeholder="Petition due"
        className="h-9 flex-1 rounded-md border border-input bg-background px-3 text-sm"
      />
      <input
        type="date"
        value={dueAt}
        onChange={(e) => setDueAt(e.target.value)}
        className="h-9 rounded-md border border-input bg-background px-3 text-sm"
      />
      <Button size="sm" type="submit" disabled={pending}>Add</Button>
    </form>
  )
}

/** Adds a person. Roles are the legal capacity, not a permission level. */
export function AddParticipantForm({ matterId }: { matterId: string }) {
  const [displayName, setDisplayName] = useState("")
  const [role, setRole] = useState("heir")
  const [org, setOrg] = useState("")
  const [pending, start] = useTransition()

  return (
    <form
      className="flex flex-col gap-2 sm:flex-row"
      onSubmit={(e) => {
        e.preventDefault()
        if (!displayName.trim()) return
        start(async () => {
          const r = await addParticipant({
            matterId,
            displayName: displayName.trim(),
            role,
            org: org.trim() || undefined,
          })
          if ("error" in r && r.error) {
            toast.error(r.error)
            return
          }
          toast.success("Added to the matter")
          setDisplayName("")
          setOrg("")
        })
      }}
    >
      <input
        value={displayName}
        onChange={(e) => setDisplayName(e.target.value)}
        placeholder="Rosa Reyes"
        className="h-9 flex-1 rounded-md border border-input bg-background px-3 text-sm"
      />
      <select
        value={role}
        onChange={(e) => setRole(e.target.value)}
        className="h-9 rounded-md border border-input bg-background px-3 text-sm"
      >
        <option value="executor">Executor</option>
        <option value="heir">Heir</option>
        <option value="beneficiary">Beneficiary</option>
        <option value="counsel">Counsel</option>
        <option value="accountant">Accountant</option>
        <option value="notary">Notary</option>
        <option value="owner">Owner</option>
        <option value="observer">Observer</option>
      </select>
      <input
        value={org}
        onChange={(e) => setOrg(e.target.value)}
        placeholder="Firm (optional)"
        className="h-9 flex-1 rounded-md border border-input bg-background px-3 text-sm"
      />
      <Button size="sm" type="submit" disabled={pending}>Add</Button>
    </form>
  )
}

/** Ticks a task off. */
export function TaskToggle({ taskId }: { taskId: string }) {
  const [pending, start] = useTransition()
  return (
    <Checkbox
      disabled={pending}
      onCheckedChange={() =>
        start(async () => {
          const r = await toggleTask(taskId)
          if ("error" in r && r.error) toast.error(r.error)
        })
      }
    />
  )
}
