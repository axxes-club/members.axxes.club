import { createUploadthing, type FileRouter } from "uploadthing/next"
import { UploadThingError } from "uploadthing/server"
import { db } from "@/lib/db"
import { assets } from "@/lib/db/schema"
import { requireTenantAccess } from "@/lib/auth/tenant-context"
import { damPermissions, damTypeOf, normalizeFolder } from "@/lib/dam/assets"
import { DAM_FOLDER_HEADER } from "@/lib/dam/upload-headers"

const f = createUploadthing()

export const ourFileRouter = {
  damUploader: f({
    image: { maxFileSize: "16MB", maxFileCount: 50 },
    video: { maxFileSize: "512MB", maxFileCount: 10 },
    audio: { maxFileSize: "64MB", maxFileCount: 20 },
    pdf: { maxFileSize: "64MB", maxFileCount: 20 },
    text: { maxFileSize: "4MB", maxFileCount: 20 },
    blob: { maxFileSize: "64MB", maxFileCount: 20 },
  })
    .middleware(async ({ req }) => {
      const context = await requireTenantAccess().catch(() => null)
      if (!context) throw new UploadThingError("Unauthorized")
      if (!damPermissions(context.role).canWrite) throw new UploadThingError("You can't upload to this workspace")

      const rawFolder = req.headers.get(DAM_FOLDER_HEADER)
      const folder = normalizeFolder(rawFolder ? decodeURIComponent(rawFolder) : null)
      return { tenantId: context.tenantId, folder }
    })
    .onUploadComplete(async ({ metadata, file }) => {
      const [row] = await db
        .insert(assets)
        .values({
          tenantId: metadata.tenantId,
          name: file.name.replace(/\.[^.]+$/, "") || file.name,
          originalFilename: file.name,
          url: file.ufsUrl,
          mimeType: file.type || null,
          fileSize: file.size,
          folder: metadata.folder,
          category: damTypeOf(file.type, null),
          source: "upload",
          tags: [],
        })
        .returning({ id: assets.id })
      return { assetId: row.id }
    }),
} satisfies FileRouter

export type OurFileRouter = typeof ourFileRouter
