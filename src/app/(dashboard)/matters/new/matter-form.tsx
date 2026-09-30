"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent } from "@/components/ui/card"
import { cn } from "@/lib/utils"
import { createMatter } from "@/lib/actions/matters"

type Template = {
  key: string
  name: string
  blurb: string
  description: string
  kinds: { key: string; label: string }[]
  defaultRoles: { role: string; label: string }[]
  defaultDeadlines: { title: string; kind: string; offsetDays: number }[]
}

/**
 * The setup wizard.
 *
 * One form, two templates. Picking a template changes the vocabulary, the roles
 * and the dates this matter opens with — it does not change which product you
 * are in or which tables are written. That is the whole "one engine, two
 * templates" claim, and it is visible right here: the form never branches on
 * the template beyond swapping option lists.
 */
export function MatterForm({ templates }: { templates: Template[] }) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()

  const [templateKey, setTemplateKey] = useState(templates[0]?.key ?? "")
  const template = templates.find((t) => t.key === templateKey) ?? templates[0]

  const [kind, setKind] = useState("")
  const [title, setTitle] = useState("")
  const [jurisdiction, setJurisdiction] = useState("")
  const [summary, setSummary] = useState("")
  const [error, setError] = useState<string | null>(null)

  function chooseTemplate(key: string) {
    setTemplateKey(key)
    setKind("") // kinds differ per template; never carry one across
  }

  function submit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    const chosenKind = kind || template?.kinds[0]?.key || ""
    if (!title.trim()) {
      setError("Give the matter a title — the year and whose it is, usually.")
      return
    }

    startTransition(async () => {
      const result = await createMatter({
        title: title.trim(),
        kind: chosenKind,
        templateKey: template?.key,
        summary: summary.trim() || undefined,
        jurisdiction: jurisdiction.trim() || undefined,
      })
      if ("error" in result && result.error) {
        setError(result.error)
        return
      }
      if ("id" in result && result.id) {
        toast.success("Matter started")
        router.push(`/matters/${result.id}`)
      }
    })
  }

  return (
    <form onSubmit={submit} className="space-y-8">
      <div className="space-y-3">
        <Label>What kind of matter is this?</Label>
        <div className="grid gap-3 md:grid-cols-2">
          {templates.map((t) => {
            const active = t.key === templateKey
            return (
              <button
                key={t.key}
                type="button"
                onClick={() => chooseTemplate(t.key)}
                aria-pressed={active}
                className={cn(
                  "rounded-xl border p-4 text-left transition-colors",
                  active ? "border-foreground/40 bg-secondary" : "hover:border-foreground/20"
                )}
              >
                <p className="text-title-sm">{t.name}</p>
                <p className="mt-1 text-body-sm text-muted-foreground">{t.blurb}</p>
              </button>
            )
          })}
        </div>
        {template && (
          <p className="text-body-sm text-muted-foreground">{template.description}</p>
        )}
      </div>

      <Card>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="title">Title</Label>
            <Input
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Estate of Carmen Reyes-Veray"
              autoFocus
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="kind">Type</Label>
              <select
                id="kind"
                value={kind || template?.kinds[0]?.key || ""}
                onChange={(e) => setKind(e.target.value)}
                className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
              >
                {template?.kinds.map((k) => (
                  <option key={k.key} value={k.key}>{k.label}</option>
                ))}
              </select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="jurisdiction">Where</Label>
              <Input
                id="jurisdiction"
                value={jurisdiction}
                onChange={(e) => setJurisdiction(e.target.value)}
                placeholder="Puerto Rico"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="summary">What is this, in a sentence?</Label>
            <Textarea
              id="summary"
              rows={3}
              value={summary}
              onChange={(e) => setSummary(e.target.value)}
              placeholder="Settling the estate; two adult children, one property in Santurce."
            />
          </div>
        </CardContent>
      </Card>

      {template && template.defaultDeadlines.length > 0 && (
        <div className="space-y-2">
          <Label>It opens with these dates</Label>
          <ul className="space-y-1.5">
            {template.defaultDeadlines.map((d) => (
              <li key={d.title} className="flex items-baseline justify-between gap-4 text-body-sm">
                <span>{d.title}</span>
                <span className="shrink-0 text-muted-foreground">
                  {d.offsetDays} {d.offsetDays === 1 ? "day" : "days"}
                </span>
              </li>
            ))}
          </ul>
          <p className="text-body-sm text-muted-foreground">
            All of them editable, none of them binding. A date nobody agreed to is
            just a reminder to have the conversation.
          </p>
        </div>
      )}

      {error && (
        <p role="alert" className="rounded-md bg-destructive/10 px-3 py-2 text-body-sm text-destructive">
          {error}
        </p>
      )}

      <div className="flex items-center gap-3">
        <Button type="submit" disabled={pending}>
          {pending ? "Starting…" : "Start this matter"}
        </Button>
        <Button asChild variant="ghost">
          <Link href="/matters">Cancel</Link>
        </Button>
      </div>
    </form>
  )
}
