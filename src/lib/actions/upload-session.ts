"use server"

import { and, eq } from "drizzle-orm"
import { randomBytes } from "crypto"
import QRCode from "qrcode"
import { requireTenantAccess } from "@/lib/auth/tenant-context"
import { db } from "@/lib/db"
import { uploadSessions } from "@/lib/db/schema"
import { damPermissions, normalizeFolder } from "@/lib/dam/assets"

// Phones open the capture page on the Folders app, which owns /m/[token].
// Override with FOLDERS_APP_URL once folders.axxes.club has DNS.
const FOLDERS_APP_URL = (process.env.FOLDERS_APP_URL || "https://dam.axxes.club").replace(/\/$/, "")
const TTL_MS = 30 * 60 * 1000

export async function createUploadSession(folder: string | null) {
  const { tenantId, userId, role } = await requireTenantAccess()
  if (!damPermissions(role).canWrite) throw new Error("You can't upload to this workspace")

  const token = randomBytes(24).toString("base64url")
  const expiresAt = new Date(Date.now() + TTL_MS)
  await db.insert(uploadSessions).values({ token, tenantId, folder: normalizeFolder(folder), createdById: userId, expiresAt })

  const url = `${FOLDERS_APP_URL}/m/${token}`
  const qr = await QRCode.toString(url, {
    type: "svg",
    margin: 1,
    width: 220,
    errorCorrectionLevel: "M",
    color: { dark: "#242424", light: "#ffffff" },
  })
  return { token, url, expiresAt: expiresAt.toISOString(), qr }
}

export async function deleteUploadSession(token: string) {
  const { tenantId } = await requireTenantAccess()
  await db.delete(uploadSessions).where(and(eq(uploadSessions.token, token), eq(uploadSessions.tenantId, tenantId)))
  return { success: true }
}
