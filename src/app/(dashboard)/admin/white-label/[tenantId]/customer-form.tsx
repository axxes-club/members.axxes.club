"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Textarea } from "@/components/ui/textarea"
import { inviteWhiteLabelAdmin, updateWhiteLabelCustomer, type WhiteLabelCustomer } from "@/lib/actions/white-label"

type Loc = { es: string; en: string }
const loc = (v?: { es?: string; en?: string }): Loc => ({ es: v?.es ?? "", en: v?.en ?? "" })

/** Everything about one white-label customer, with a preview of their sign-in page. */
export function CustomerForm({ customer }: { customer: WhiteLabelCustomer }) {
  const router = useRouter()
  const [pending, start] = useTransition()
  const [enabled, setEnabled] = useState(customer.whiteLabel.enabled)
  const [slug, setSlug] = useState(customer.whiteLabel.slug)
  const [brand, setBrand] = useState({
    brandName: customer.brand.brandName ?? "",
    tagline: customer.brand.tagline ?? "",
    primaryColor: customer.brand.primaryColor ?? "#0f6cbd",
    accentColor: customer.brand.accentColor ?? "",
    logoUrl: customer.brand.logoUrl ?? "",
    logoDarkUrl: customer.brand.logoDarkUrl ?? "",
    logoIconUrl: customer.brand.logoIconUrl ?? "",
    faviconUrl: customer.brand.faviconUrl ?? "",
  })
  const [headline, setHeadline] = useState(loc(customer.whiteLabel.login?.headline))
  const [tagline, setTagline] = useState(loc(customer.whiteLabel.login?.tagline))
  const [notice, setNotice] = useState(loc(customer.whiteLabel.login?.notice))
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null)
  const [inviteEmail, setInviteEmail] = useState("")
  const [inviteUrl, setInviteUrl] = useState("")

  const save = () => {
    setMessage(null)
    start(async () => {
      const res = await updateWhiteLabelCustomer(customer.tenantId, {
        enabled,
        slug,
        ...brand,
        login: { headline, tagline, notice },
      })
      setMessage(res.ok ? { ok: true, text: "Saved. Their sign-in page and apps pick this up on the next page load." } : { ok: false, text: res.error })
      if (res.ok) router.refresh()
    })
  }

  const invite = () => {
    start(async () => {
      const res = await inviteWhiteLabelAdmin(customer.tenantId, inviteEmail)
      if (res.ok) setInviteUrl(res.inviteUrl)
      else setMessage({ ok: false, text: res.error })
    })
  }

  const field = (key: keyof typeof brand, label: string, placeholder = "") => (
    <div>
      <Label htmlFor={`b-${key}`}>{label}</Label>
      <Input
        id={`b-${key}`}
        value={brand[key]}
        onChange={(e) => setBrand((b) => ({ ...b, [key]: e.target.value }))}
        placeholder={placeholder}
        className="mt-1.5"
      />
    </div>
  )

  const pair = (label: string, value: Loc, set: (v: Loc) => void, long = false) => (
    <div className="grid gap-3 sm:grid-cols-2">
      {(["es", "en"] as const).map((lang) => (
        <div key={lang}>
          <Label htmlFor={`${label}-${lang}`}>{label} ({lang === "es" ? "Español" : "English"})</Label>
          {long ? (
            <Textarea id={`${label}-${lang}`} rows={2} value={value[lang]} onChange={(e) => set({ ...value, [lang]: e.target.value })} className="mt-1.5" />
          ) : (
            <Input id={`${label}-${lang}`} value={value[lang]} onChange={(e) => set({ ...value, [lang]: e.target.value })} className="mt-1.5" />
          )}
        </div>
      ))}
    </div>
  )

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Status and address</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="text-sm font-medium">White-label is live</p>
                <p className="text-xs text-muted-foreground">Off: their people see standard AXXES branding.</p>
              </div>
              <Switch checked={enabled} onCheckedChange={setEnabled} aria-label="White-label is live" />
            </div>
            <div>
              <Label htmlFor="wl-slug">Address</Label>
              <Input id="wl-slug" value={slug} onChange={(e) => setSlug(e.target.value.toLowerCase())} className="mt-1.5 font-mono" />
              <p className="mt-1 text-xs text-muted-foreground">handshake.axxes.club/o/{slug}</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Brand</CardTitle>
            <CardDescription>Shown on their sign-in page and in every AXXES product they use.</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-2">
            {field("brandName", "Name shown to users")}
            {field("tagline", "Tagline")}
            <div>
              <Label htmlFor="b-primary">Primary color</Label>
              <div className="mt-1.5 flex gap-2">
                <input type="color" value={brand.primaryColor || "#0f6cbd"} onChange={(e) => setBrand((b) => ({ ...b, primaryColor: e.target.value }))} className="h-9 w-12 rounded border" aria-label="Pick primary color" />
                <Input id="b-primary" value={brand.primaryColor} onChange={(e) => setBrand((b) => ({ ...b, primaryColor: e.target.value }))} className="font-mono" />
              </div>
            </div>
            {field("accentColor", "Accent color", "#rrggbb")}
            {field("logoUrl", "Logo (light backgrounds)", "https://…")}
            {field("logoDarkUrl", "Logo (dark backgrounds)", "https://…")}
            {field("logoIconUrl", "Square icon", "https://…")}
            {field("faviconUrl", "Favicon", "https://…")}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Sign-in page wording</CardTitle>
            <CardDescription>Leave blank to use the name and tagline above.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {pair("Headline", headline, setHeadline)}
            {pair("Subheading", tagline, setTagline)}
            {pair("Notice", notice, setNotice, true)}
          </CardContent>
        </Card>

        {message && (
          <p role="status" className={`text-sm ${message.ok ? "text-muted-foreground" : "text-destructive"}`}>{message.text}</p>
        )}
        <Button onClick={save} disabled={pending}>{pending ? "Saving…" : "Save changes"}</Button>

        <Card>
          <CardHeader>
            <CardTitle>Invite an admin</CardTitle>
            <CardDescription>They get admin rights in this organization. Send them the link.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex gap-2">
              <Input type="email" value={inviteEmail} onChange={(e) => setInviteEmail(e.target.value)} placeholder="name@customer.org" />
              <Button variant="outline" onClick={invite} disabled={pending || !inviteEmail}>Create invite</Button>
            </div>
            {inviteUrl && <p className="break-all text-sm"><code className="rounded bg-muted px-1">{inviteUrl}</code></p>}
          </CardContent>
        </Card>
      </div>

      {/* Preview of the sign-in card, in their colors. */}
      <div className="lg:sticky lg:top-4 lg:self-start">
        <p className="mb-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">Sign-in preview</p>
        <div className="overflow-hidden rounded-xl border bg-white text-neutral-900 shadow-sm">
          <div className="h-2" style={{ background: brand.primaryColor || "#0f6cbd" }} />
          <div className="space-y-4 p-6">
            {brand.logoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={brand.logoUrl} alt="" className="h-12 max-w-full object-contain" />
            ) : (
              <p className="text-lg font-semibold">{brand.brandName}</p>
            )}
            <div>
              <p className="text-xl font-semibold">{headline.es || brand.brandName || customer.name}</p>
              {(tagline.es || brand.tagline) && <p className="mt-1 text-sm text-neutral-500">{tagline.es || brand.tagline}</p>}
            </div>
            <div className="space-y-2">
              <div className="h-9 rounded-md border border-neutral-200" />
              <div className="h-9 rounded-md border border-neutral-200" />
              <div className="h-9 rounded-md text-center text-sm font-medium leading-9 text-white" style={{ background: brand.primaryColor || "#0f6cbd" }}>
                Iniciar sesión
              </div>
            </div>
            {notice.es && <p className="text-xs text-neutral-500">{notice.es}</p>}
            <p className="text-center text-[11px] text-neutral-400">Powered by AXXES</p>
          </div>
        </div>
      </div>
    </div>
  )
}
