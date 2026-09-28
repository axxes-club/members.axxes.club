"use client"

import { useEffect, useRef, useState } from "react"
import { Smartphone, Loader2, AlertTriangle, RefreshCw, Check } from "lucide-react"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { createUploadSession, pollUploadSession, deleteUploadSession } from "@/lib/actions/upload-session"

type Handoff = { token: string; url: string; qr: string; expiresAt: string }

export function PhotoHandoffDialog({
  folder,
  onAttach,
  onClose
}: {
  folder: string | null
  onAttach: (urls: string[]) => void
  onClose: () => void
}) {
  const [handoff, setHandoff] = useState<Handoff | null>(null)
  const [photos, setPhotos] = useState<string[]>([])
  const [failed, setFailed] = useState(false)
  const [expired, setExpired] = useState(false)
  const [attaching, setAttaching] = useState(false)
  const [minutesLeft, setMinutesLeft] = useState(0)
  const started = useRef(false)

  const start = async () => {
    setFailed(false)
    setExpired(false)
    setPhotos([])
    try {
      const res = await createUploadSession(folder, window.location.origin)
      setHandoff(res)
    } catch {
      setFailed(true)
    }
  }

  useEffect(() => {
    if (started.current) return
    started.current = true
    start()
  }, [])

  useEffect(() => {
    if (!handoff) return
    const timer = setInterval(async () => {
      try {
        const data = await pollUploadSession(handoff.token)
        if (data.error) return
        setPhotos(data.photos?.map((p: any) => p.url) || [])
        if (data.expiresAt) {
          setMinutesLeft(Math.max(0, Math.round((new Date(data.expiresAt).getTime() - Date.now()) / 60000)))
        }
        if (data.expired) setExpired(true)
      } catch {}
    }, 2000)
    return () => clearInterval(timer)
  }, [handoff])

  const finish = async () => {
    if (photos.length === 0) return
    setAttaching(true)
    try {
      await onAttach(photos)
      if (handoff) await deleteUploadSession(handoff.token)
      onClose()
    } finally {
      setAttaching(false)
    }
  }

  useEffect(() => {
    if (photos.length > 0 && !attaching) {
      const t = setTimeout(() => finish(), 0)
      return () => clearTimeout(t)
    }
  }, [photos, attaching])

  return (
    <Dialog open onOpenChange={() => onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Smartphone className="size-5 text-primary" /> Upload from Phone
          </DialogTitle>
          <DialogDescription>
            Point your phone's camera at this QR code to upload photos directly to this folder.
          </DialogDescription>
        </DialogHeader>

        <div className="px-5 py-5">
          {failed ? (
            <div className="flex flex-col items-center gap-3 py-8 text-center">
              <AlertTriangle className="size-6 text-destructive" />
              <p className="text-sm font-semibold">Connection failed</p>
              <Button variant="outline" onClick={start}><RefreshCw className="mr-2 size-4" /> Try again</Button>
            </div>
          ) : !handoff ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="size-6 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <div className="flex flex-col items-center gap-3">
              <div
                className="rounded-lg border bg-white p-3"
                dangerouslySetInnerHTML={{ __html: handoff.qr }}
              />
              <p className="text-xs text-muted-foreground">
                {expired ? "QR Code expired" : `Expires in \${minutesLeft || 30} minutes`}
              </p>
              <div className="mt-2 w-full rounded-md border bg-muted/50 p-3">
                <p className="mb-2 flex items-center gap-2 text-xs font-semibold text-muted-foreground">
                  {photos.length === 0 ? (
                    <><Loader2 className="size-3 animate-spin" /> Waiting for phone...</>
                  ) : (
                    <><Check className="size-3 text-emerald-500" /> `\${photos.length} photos arrived`</>
                  )}
                </p>
                {photos.length > 0 && (
                  <div className="grid grid-cols-4 gap-2">
                    {photos.map(url => (
                      <img key={url} src={url} alt="" className="aspect-square w-full rounded-md object-cover border" />
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        <DialogFooter className="sm:justify-end">
          <Button type="button" variant="secondary" onClick={onClose}>Cancel</Button>
          <Button type="button" onClick={finish} disabled={photos.length === 0 || attaching}>
            {attaching ? <Loader2 className="mr-2 size-4 animate-spin" /> : <Check className="mr-2 size-4" />}
            {attaching ? "Attaching..." : `Attach \${photos.length} files`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
