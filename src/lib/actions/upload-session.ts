"use server"

import { requireTenantAccess } from "@/lib/auth/tenant-context"
import { db } from "@/lib/db"
import { uploadSessions } from "@/lib/db/schema"
import { randomBytes } from "crypto"
import QRCode from "qrcode"
import { eq } from "drizzle-orm"

export async function createUploadSession(folder: string | null, baseUrl: string) {
  const { tenantId, userId, role } = await requireTenantAccess()
  if (!["owner", "admin", "manager", "member"].includes(role)) {
    throw new Error("Unauthorized")
  }

  const token = randomBytes(24).toString("base64url")
  const expiresAt = new Date(Date.now() + 30 * 60 * 1000)

  await db.insert(uploadSessions).values({
    token,
    tenantId,
    folder,
    createdById: userId,
    expiresAt,
  })

  // We construct the URL to the Folders app mobile capture
  // For local dev, dam.axxes.club might be mapped to folders.axxes.club
  // We'll point it to folders.axxes.club/m/[token]
  const url = `https://folders.axxes.club/m/${token}`
  const qr = await QRCode.toString(url, {
    type: "svg",
    margin: 1,
    width: 220,
    errorCorrectionLevel: "M",
    color: { dark: "#242424", light: "#ffffff" }
  })

  return { token, url, expiresAt: expiresAt.toISOString(), qr }
}

export async function pollUploadSession(token: string) {
  const [session] = await db.select().from(uploadSessions).where(eq(uploadSessions.token, token))
  if (!session) return { error: "Not found", expired: true }

  const expired = session.expiresAt.getTime() < Date.now()
  return {
    photos: (session.photos || []).map(url => ({ url })),
    expiresAt: session.expiresAt.toISOString(),
    expired
  }
}

export async function deleteUploadSession(token: string) {
  await requireTenantAccess()
  await db.delete(uploadSessions).where(eq(uploadSessions.token, token))
  return { success: true }
}
