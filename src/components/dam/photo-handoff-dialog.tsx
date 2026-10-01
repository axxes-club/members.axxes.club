"use client"

import * as React from "react"
import { AlertTriangle, Check, Loader2, RefreshCw, Smartphone } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { createUploadSession, deleteUploadSession } from "@/lib/actions/upload-session"

type Handoff = { token: string; url: string; qr: string; expiresAt: string }

const POLL_MS = 2000

/**
 * Desk-to-pocket upload: a short-lived session shown as a QR code. Photos taken on
 * the phone land in the current folder and appear here as they arrive; closing the
 * dialog ends the session.
 */
type PhotoHandoffProps = {folder:string|null;onDone:()=>void;onClose:()=>void}
export function PhotoHandoffDialog(props:PhotoHandoffProps) {
  return <PhotoHandoffSession key={props.folder ?? "library"} {...props}/>
}
function PhotoHandoffSession({
  folder,
  onDone,
  onClose,
}: {
  folder: string | null
  onDone: () => void
  onClose: () => void
}) {
  const [handoff, setHandoff] = React.useState<Handoff | null>(null)
  const [photos, setPhotos] = React.useState<string[]>([])
  const [failed, setFailed] = React.useState(false)
  const [expired, setExpired] = React.useState(false)
  const [minutesLeft, setMinutesLeft] = React.useState<number | null>(null)

  const start = React.useCallback(async () => {
    setFailed(false)
    setExpired(false)
    setPhotos([])
    setHandoff(null)
    try {
      setHandoff(await createUploadSession(folder))
    } catch {
      setFailed(true)
    }
  }, [folder])

  React.useEffect(() => {
    let active = true
    createUploadSession(folder).then(value => {
      if (active) setHandoff(value)
      else void deleteUploadSession(value.token).catch(() => {})
    }).catch(() => { if (active) setFailed(true) })
    return () => { active = false }
  }, [folder])

  React.useEffect(() => {
    if (!handoff || expired) return
    const timer = setInterval(async () => {
      try {
        const res = await fetch(`/api/dam/upload-sessions/${handoff.token}`, { cache: "no-store" })
        if (!res.ok) return
        const data = await res.json()
        setPhotos(data.photos)
        setMinutesLeft(Math.max(0, Math.round((new Date(data.expiresAt).getTime() - Date.now()) / 60000)))
        if (data.expired) setExpired(true)
      } catch {
        // A dropped poll isn't worth reporting; the next one will catch up.
      }
    }, POLL_MS)
    return () => clearInterval(timer)
  }, [handoff, expired])

  const close = () => {
    if (handoff) deleteUploadSession(handoff.token).catch(() => {})
    if (photos.length) onDone()
    onClose()
  }

  return (
    <Dialog open onOpenChange={(open) => !open && close()}>
      <DialogContent className="sm:max-w-md" onContextMenu={(e) => e.stopPropagation()}>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Smartphone className="h-5 w-5" /> Upload from phone
          </DialogTitle>
          <DialogDescription>
            Scan this code with your phone&apos;s camera to add photos to {folder ? `“${folder}”` : "the library"}. No app or
            sign-in needed.
          </DialogDescription>
        </DialogHeader>

        {failed ? (
          <div className="flex flex-col items-center gap-3 py-8 text-center">
            <AlertTriangle className="h-6 w-6 text-destructive" />
            <p className="text-[13px] font-medium">Couldn&apos;t start a phone session</p>
            <Button variant="outline" onClick={start}>
              <RefreshCw /> Try again
            </Button>
          </div>
        ) : !handoff ? (
          <div className="flex items-center justify-center py-16 text-muted-foreground">
            <Loader2 className="h-6 w-6 animate-spin" />
          </div>
        ) : (
          <div className="flex flex-col items-center gap-3">
            <div className="border bg-white p-3" dangerouslySetInnerHTML={{ __html: handoff.qr }} />
            <p className="text-xs text-muted-foreground">
              {expired ? (
                <>
                  <span className="text-destructive">This code expired. </span>
                  <button type="button" className="underline" onClick={start}>Get a new code</button>
                </>
              ) : (
                `Expires in ${minutesLeft ?? 30} minutes`
              )}
            </p>
            <details className="w-full text-center">
              <summary className="cursor-pointer text-xs text-muted-foreground">Or copy the link</summary>
              <p className="mt-1 select-all break-all font-mono text-xs">{handoff.url}</p>
            </details>
            <div className="w-full border bg-muted/40 p-3">
              <p className="mb-2 flex items-center gap-2 text-xs font-medium text-muted-foreground">
                {photos.length === 0 ? (
                  <><Loader2 className="h-3 w-3 animate-spin" /> Waiting for photos…</>
                ) : (
                  <><Check className="h-3 w-3" /> {photos.length} photo{photos.length === 1 ? "" : "s"} added</>
                )}
              </p>
              {photos.length > 0 && (
                <div className="grid grid-cols-4 gap-2">
                  {photos.map((url) => (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img key={url} src={url} alt="" className="aspect-square w-full border object-cover" />
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        <DialogFooter>
          <Button onClick={close}>{photos.length ? "Done" : "Close"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
