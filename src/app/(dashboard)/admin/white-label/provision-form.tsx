"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { provisionWhiteLabelCustomer } from "@/lib/actions/white-label"

/** Sets up a new white-label customer, or turns an existing organization into one. */
export function ProvisionForm({ organizations }: { organizations: { id: string; name: string }[] }) {
  const router = useRouter()
  const [pending, start] = useTransition()
  const [existingTenantId, setExisting] = useState("")
  const [name, setName] = useState("")
  const [slug, setSlug] = useState("")
  const [adminEmail, setAdminEmail] = useState("")
  const [primaryColor, setPrimaryColor] = useState("#0f6cbd")
  const [logoUrl, setLogoUrl] = useState("")
  const [error, setError] = useState("")
  const [result, setResult] = useState<{ inviteUrl: string | null; signInUrl: string; tenantId: string } | null>(null)

  const submit = (e: React.FormEvent) => {
    e.preventDefault()
    setError("")
    start(async () => {
      const res = await provisionWhiteLabelCustomer({
        existingTenantId: existingTenantId || undefined,
        name,
        slug,
        adminEmail: adminEmail || undefined,
        primaryColor,
        logoUrl,
      })
      if (!res.ok) return setError(res.error)
      setResult(res)
      router.refresh()
    })
  }

  if (result) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Customer is set up</CardTitle>
          <CardDescription>Finish their branding on the customer page, then send the admin their invitation.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          <p>Sign-in page: <a className="underline" href={result.signInUrl} target="_blank" rel="noreferrer">{result.signInUrl}</a></p>
          {result.inviteUrl && (
            <p className="break-all">Admin invitation (valid 14 days): <code className="rounded bg-muted px-1">{result.inviteUrl}</code></p>
          )}
          <div className="flex gap-2">
            <Button onClick={() => router.push(`/admin/white-label/${result.tenantId}`)}>Open customer</Button>
            <Button variant="outline" onClick={() => setResult(null)}>Set up another</Button>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>New customer</CardTitle>
        <CardDescription>Creates the organization, its brand and its sign-in address, and invites its first admin.</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={submit} className="grid gap-4 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <Label htmlFor="wl-existing">Organization</Label>
            <select
              id="wl-existing"
              value={existingTenantId}
              onChange={(e) => setExisting(e.target.value)}
              className="mt-1.5 h-9 w-full rounded-md border bg-background px-3 text-sm"
            >
              <option value="">Create a new organization</option>
              {organizations.map((o) => (
                <option key={o.id} value={o.id}>Convert: {o.name}</option>
              ))}
            </select>
          </div>
          {!existingTenantId && (
            <div>
              <Label htmlFor="wl-name">Customer name</Label>
              <Input id="wl-name" required value={name} onChange={(e) => setName(e.target.value)} placeholder="Educación Municipal de Bayamón" className="mt-1.5" />
            </div>
          )}
          <div>
            <Label htmlFor="wl-slug">Address</Label>
            <Input id="wl-slug" required value={slug} onChange={(e) => setSlug(e.target.value.toLowerCase())} placeholder="bayamon" className="mt-1.5 font-mono" />
            <p className="mt-1 text-xs text-muted-foreground">handshake.axxes.club/o/{slug || "…"}</p>
          </div>
          <div>
            <Label htmlFor="wl-admin">First admin&rsquo;s email <span className="text-muted-foreground">(optional)</span></Label>
            <Input id="wl-admin" type="email" value={adminEmail} onChange={(e) => setAdminEmail(e.target.value)} className="mt-1.5" />
          </div>
          <div>
            <Label htmlFor="wl-color">Primary color</Label>
            <div className="mt-1.5 flex gap-2">
              <input type="color" value={primaryColor} onChange={(e) => setPrimaryColor(e.target.value)} className="h-9 w-12 rounded border" aria-label="Pick a color" />
              <Input id="wl-color" value={primaryColor} onChange={(e) => setPrimaryColor(e.target.value)} className="font-mono" />
            </div>
          </div>
          <div className="sm:col-span-2">
            <Label htmlFor="wl-logo">Logo URL <span className="text-muted-foreground">(optional)</span></Label>
            <Input id="wl-logo" value={logoUrl} onChange={(e) => setLogoUrl(e.target.value)} placeholder="https://…" className="mt-1.5" />
          </div>
          {error && <p role="alert" className="text-sm text-destructive sm:col-span-2">{error}</p>}
          <div className="sm:col-span-2">
            <Button type="submit" disabled={pending}>{pending ? "Setting up…" : "Set up customer"}</Button>
          </div>
        </form>
      </CardContent>
    </Card>
  )
}
